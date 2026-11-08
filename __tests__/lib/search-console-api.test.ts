import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createVerify, generateKeyPairSync, createPublicKey } from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  SearchConsoleApiError,
  buildAssertionJwt,
  exchangeAssertionForToken,
  fetchSearchConsoleStats,
  loadGscCredentials,
  periodRange,
  querySearchAnalytics,
  summarizeRows,
} from '@/lib/search-console-api'

// Vraie paire de clés RSA : la signature est vérifiée cryptographiquement, pas simulée.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
const PEM = privateKey as string
const PUB = createPublicKey(publicKey as string)

const b64urlDecode = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

describe('buildAssertionJwt', () => {
  it('produit un JWT RS256 dont la signature se vérifie avec la clé publique', () => {
    const jwt = buildAssertionJwt({ clientEmail: 'svc@projet.iam.gserviceaccount.com', privateKey: PEM, nowSeconds: 1_700_000_000 })
    const [header, claims, signature] = jwt.split('.')
    expect(jwt.split('.')).toHaveLength(3)

    expect(JSON.parse(b64urlDecode(header))).toEqual({ alg: 'RS256', typ: 'JWT' })
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${header}.${claims}`)
    expect(verifier.verify(PUB, Buffer.from(signature, 'base64url'))).toBe(true)
  })

  it('porte les bonnes revendications (émetteur, portée, expiration à 1 h)', () => {
    const now = 1_700_000_000
    const jwt = buildAssertionJwt({ clientEmail: 'svc@x.iam.gserviceaccount.com', privateKey: PEM, nowSeconds: now })
    const claims = JSON.parse(b64urlDecode(jwt.split('.')[1]))
    expect(claims.iss).toBe('svc@x.iam.gserviceaccount.com')
    expect(claims.scope).toBe('https://www.googleapis.com/auth/webmasters.readonly')
    expect(claims.aud).toBe('https://oauth2.googleapis.com/token')
    expect(claims.iat).toBe(now)
    expect(claims.exp).toBe(now + 3600)
  })

  it('refuse une clé privée invalide', () => {
    expect(() => buildAssertionJwt({ clientEmail: 'x@y.z', privateKey: 'pas-une-clé' })).toThrow()
  })
})

describe('loadGscCredentials', () => {
  it('renvoie null si l’adresse ou la clé manque', () => {
    expect(loadGscCredentials({})).toBeNull()
    expect(loadGscCredentials({ GSC_SERVICE_ACCOUNT_EMAIL: 'a@b.c' })).toBeNull()
    expect(loadGscCredentials({ GSC_SERVICE_ACCOUNT_PRIVATE_KEY: PEM })).toBeNull()
    expect(loadGscCredentials({ GSC_SERVICE_ACCOUNT_EMAIL: '  ', GSC_SERVICE_ACCOUNT_PRIVATE_KEY: PEM })).toBeNull()
  })

  it('restaure les retours à la ligne écrits « \\n » (cas Vercel)', () => {
    const oneLine = PEM.replace(/\n/g, '\\n')
    const creds = loadGscCredentials({ GSC_SERVICE_ACCOUNT_EMAIL: 'a@b.c', GSC_SERVICE_ACCOUNT_PRIVATE_KEY: oneLine })!
    expect(creds.clientEmail).toBe('a@b.c')
    expect(creds.privateKey).toContain('\n')
    expect(creds.privateKey).not.toContain('\\n')
    // La clé restaurée est utilisable pour signer.
    expect(() => buildAssertionJwt({ clientEmail: 'a@b.c', privateKey: creds.privateKey })).not.toThrow()
  })
})

describe('periodRange', () => {
  it('s’arrête à J-2 (Search Console ignore les 2 derniers jours) et couvre la durée demandée', () => {
    const today = new Date('2026-03-15T10:00:00Z')
    const { startDate, endDate } = periodRange(28, today)
    expect(endDate).toBe('2026-03-13')
    expect(startDate).toBe('2026-02-14') // 28 jours inclusifs : 14 févr. → 13 mars
  })

  it('gère le passage de mois', () => {
    expect(periodRange(7, new Date('2026-03-02T00:00:00Z'))).toEqual({ startDate: '2026-02-22', endDate: '2026-02-28' })
  })
})

describe('summarizeRows', () => {
  it('additionne clics et impressions, et pondère la position par les impressions', () => {
    const totals = summarizeRows([
      { keys: ['a'], clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { keys: ['b'], clicks: 5, impressions: 300, ctr: 0.0167, position: 6 },
    ])
    expect(totals.clicks).toBe(15)
    expect(totals.impressions).toBe(400)
    expect(totals.ctr).toBeCloseTo(15 / 400, 6)
    expect(totals.position).toBeCloseTo((2 * 100 + 6 * 300) / 400, 6) // 5
  })

  it('ne divise pas par zéro quand il n’y a aucune impression', () => {
    expect(summarizeRows([])).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 })
  })
})

// ── Intégration : vrais appels HTTP vers un serveur local ──────────────────────────────
type Handler = (req: http.IncomingMessage, body: string) => { status: number; json: unknown }
let server: http.Server
let base: string
let handler: Handler

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      const { status, json } = handler(req, body)
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(json))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())) })

describe('exchangeAssertionForToken (HTTP réel)', () => {
  it('renvoie le jeton d’accès fourni par Google', async () => {
    handler = () => ({ status: 200, json: { access_token: 'ya29.abc' } })
    const token = await exchangeAssertionForToken({ assertion: 'x.y.z', tokenUrl: `${base}/token` })
    expect(token).toBe('ya29.abc')
  })

  it('envoie bien l’assertion en « jwt-bearer »', async () => {
    let received = ''
    handler = (_req, body) => { received = body; return { status: 200, json: { access_token: 'ok' } } }
    await exchangeAssertionForToken({ assertion: 'my.assertion', tokenUrl: `${base}/token` })
    expect(received).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer')
    expect(received).toContain('assertion=my.assertion')
  })

  it('explique quoi faire quand Google refuse le compte de service (invalid_grant)', async () => {
    handler = () => ({ status: 400, json: { error: 'invalid_grant' } })
    await expect(exchangeAssertionForToken({ assertion: 'x.y.z', tokenUrl: `${base}/token` }))
      .rejects.toMatchObject({ name: 'SearchConsoleApiError' })
    try {
      await exchangeAssertionForToken({ assertion: 'x.y.z', tokenUrl: `${base}/token` })
    } catch (e) {
      expect((e as SearchConsoleApiError).hint).toContain('Utilisateurs et autorisations')
    }
  })
})

describe('querySearchAnalytics (HTTP réel)', () => {
  it('transmet la période et la dimension, et lit les lignes', async () => {
    let sent: Record<string, unknown> = {}
    handler = (_req, body) => {
      sent = JSON.parse(body)
      return { status: 200, json: { rows: [{ keys: ['coaching paris'], clicks: 3, impressions: 40, ctr: 0.075, position: 4.2 }] } }
    }
    const rows = await querySearchAnalytics({
      accessToken: 'tok', siteUrl: 'https://happyhumans.vercel.app/',
      startDate: '2026-02-14', endDate: '2026-03-13', dimension: 'query', apiUrl: base,
    })
    expect(sent).toMatchObject({ startDate: '2026-02-14', endDate: '2026-03-13', dimensions: ['query'], type: 'web' })
    expect(rows[0].keys[0]).toBe('coaching paris')
    expect(rows[0].position).toBeCloseTo(4.2)
  })

  it('renvoie une liste vide si l’API ne fournit pas de lignes', async () => {
    handler = () => ({ status: 200, json: {} })
    const rows = await querySearchAnalytics({
      accessToken: 'tok', siteUrl: 'https://x/', startDate: 'a', endDate: 'b', dimension: 'page', apiUrl: base,
    })
    expect(rows).toEqual([])
  })

  it('explique une erreur 403 (propriété inaccessible)', async () => {
    handler = () => ({ status: 403, json: { error: { message: 'forbidden' } } })
    try {
      await querySearchAnalytics({
        accessToken: 'tok', siteUrl: 'https://x/', startDate: 'a', endDate: 'b', dimension: 'query', apiUrl: base,
      })
      throw new Error('aurait dû lever')
    } catch (e) {
      expect(e).toBeInstanceOf(SearchConsoleApiError)
      expect((e as SearchConsoleApiError).hint).toContain('propriété')
    }
  })
})

describe('fetchSearchConsoleStats (bout en bout)', () => {
  it('obtient un jeton puis les requêtes et les pages, et calcule les totaux', async () => {
    const calls: string[] = []
    handler = (req, body) => {
      calls.push(req.url ?? '')
      if ((req.url ?? '').includes('/token')) return { status: 200, json: { access_token: 'tok' } }
      const dim = (JSON.parse(body) as { dimensions: string[] }).dimensions[0]
      if (dim === 'query') {
        return { status: 200, json: { rows: [{ keys: ['coaching'], clicks: 7, impressions: 70, ctr: 0.1, position: 3 }] } }
      }
      return { status: 200, json: { rows: [{ keys: ['https://happyhumans.vercel.app/coaching'], clicks: 4, impressions: 50, ctr: 0.08, position: 5 }] } }
    }
    const stats = await fetchSearchConsoleStats({
      credentials: { clientEmail: 'svc@x.iam.gserviceaccount.com', privateKey: PEM },
      siteUrl: 'https://happyhumans.vercel.app/',
      days: 28,
      today: new Date('2026-03-15T00:00:00Z'),
      tokenUrl: `${base}/token`,
      apiUrl: base,
    })
    expect(calls.some(u => u.includes('/token'))).toBe(true)
    expect(stats.period).toEqual({ startDate: '2026-02-14', endDate: '2026-03-13', days: 28 })
    expect(stats.totals).toMatchObject({ clicks: 7, impressions: 70 })
    expect(stats.topQueries[0].keys[0]).toBe('coaching')
    expect(stats.topPages[0].keys[0]).toContain('/coaching')
  })
})
