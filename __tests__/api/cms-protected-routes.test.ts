// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'

/**
 * Routes d'administration ouvertes à tout le monde.
 *
 * Avant : /api/send-email (relais d'e-mails ouvert : envoi vers n'importe quelle adresse depuis l'expéditeur du site),
 * /api/instagram/post (publication sur le compte Instagram) et les routes de génération IA (quota Groq) répondaient
 * sans aucune authentification. Ces tests les verrouillent, et un garde-fou impose une décision explicite
 * pour toute NOUVELLE route API.
 */

const root = path.resolve(__dirname, '../..')

beforeAll(() => { process.env.CMS_PASSWORD = 'mot-de-passe-de-test' })

const anon = (method: string) => new NextRequest('http://localhost/api/x', { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })

const PROTECTED: [string, string, string][] = [
  ['send-email', '@/app/api/send-email/route', 'POST'],
  ['instagram/post', '@/app/api/instagram/post/route', 'POST'],
  ['instagram/post', '@/app/api/instagram/post/route', 'GET'],
  ['ai/generate', '@/app/api/ai/generate/route', 'POST'],
  ['ai/generate', '@/app/api/ai/generate/route', 'GET'],
  ['blog/generate', '@/app/api/blog/generate/route', 'POST'],
  ['carousel/generate', '@/app/api/carousel/generate/route', 'POST'],
  ['test-upload', '@/app/api/test-upload/route', 'GET'],
]

describe('routes d’administration : refusées sans authentification', () => {
  it.each(PROTECTED)('/api/%s %s → 401', async (_name, mod, method) => {
    const handler = (await import(/* @vite-ignore */ mod))[method]
    const res = await handler(anon(method))
    expect(res.status).toBe(401)
  })

  it('le BON mot de passe dans un en-tête « x-cms-auth » ne les ouvre plus', async () => {
    const { POST } = await import('@/app/api/send-email/route')
    const res = await POST(new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cms-auth': 'mot-de-passe-de-test' },
      body: JSON.stringify({ type: 'admin', to: 'victime@example.com', data: { name: 'x' } }),
    }))
    expect(res.status).toBe(401)
  })

  it('le cookie fabriqué « hh_cms_edit=1 » ne les ouvre pas non plus', async () => {
    const { POST } = await import('@/app/api/send-email/route')
    const res = await POST(new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'hh_cms_edit=1' },
      body: JSON.stringify({ type: 'admin', to: 'victime@example.com', data: { name: 'x' } }),
    }))
    expect(res.status).toBe(401)
  })
})

// ── Garde-fou : toute route API doit être protégée OU figurer ici, avec la raison ──────────────────────────────
const PUBLIC_ROUTES: Record<string, string> = {
  '/api/booking': 'formulaire public de réservation (liste des créneaux + demande)',
  '/api/contact': 'formulaire de contact public',
  '/api/newsletter': 'inscription publique à la newsletter',
  '/api/brevo/subscribe': 'inscription publique à la newsletter (Brevo)',
  '/api/cms/auth': 'connexion à l’admin (c’est elle qui authentifie)',
  '/api/cms/public-articles': 'lecture publique des articles publiés',
  '/api/cms/public-settings': 'lecture publique des réglages d’affichage',
  '/api/cms/public-temoignages': 'lecture publique des témoignages',
  '/api/cms/public-content': 'lecture publique du contenu ; les brouillons exigent une session (preview)',
  '/api/calendly/status': 'vérifie la disponibilité d’un compte Calendly pour l’agenda public (lecture seule, aucun réglage exposé)',
  '/api/keep-alive': 'cron Vercel qui garde la base active',
  '/api/cms-html': 'page HTML statique d’information',
  '/api/questionnaires/[slug]': 'lecture publique d’un questionnaire actif (QR code) ; aucune réponse exposée',
  '/api/questionnaires/[slug]/submit': 'envoi public des réponses d’un questionnaire actif ; tout est revalidé côté serveur',
}

function routeFiles(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) routeFiles(p, out)
    else if (/^route\.(ts|js)$/.test(e.name)) out.push(p)
  }
  return out
}

describe('connexion : aucune fuite d’information sur le mot de passe', () => {
  it('la route de débogage /api/cms/test-auth n’existe plus', () => {
    expect(fs.existsSync(path.join(root, 'app/api/cms/test-auth/route.ts'))).toBe(false)
  })

  it('/api/cms/auth n’expose plus PUT (longueur du mot de passe)', async () => {
    const mod = await import('@/app/api/cms/auth/route')
    expect('PUT' in mod).toBe(false)
  })

  it('GET /api/cms/auth ne renvoie pas le jeton de session (cookie httpOnly)', async () => {
    const { GET, POST } = await import('@/app/api/cms/auth/route')
    const login = await POST(new Request('http://localhost/api/cms/auth', { method: 'POST', body: JSON.stringify({ password: 'mot-de-passe-de-test' }) }))
    const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''
    expect(cookie).toMatch(/^happyhumans_cms_session=.+/)
    const res = await GET(new Request('http://localhost/api/cms/auth', { headers: { cookie } }))
    expect(await res.json()).toEqual({ ok: true })
  })

  it('aucun code du site ne garde le mot de passe dans le navigateur', () => {
    const offenders = ['app', 'components', 'hooks', 'lib'].flatMap(d => routeFilesAll(path.join(root, d)))
      .filter(f => /localStorage\.setItem\(\s*['"]cms_password/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

function routeFilesAll(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) routeFilesAll(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

describe('garde-fou : aucune route API ouverte sans décision explicite', () => {
  const files = routeFiles(path.join(root, 'app/api'))
  it.each(files.map(f => ['/api' + f.slice(path.join(root, 'app/api').length).replace(/\\/g, '/').replace(/\/route\.(ts|js)$/, ''), f]))(
    '%s',
    (route, file) => {
      const src = fs.readFileSync(file, 'utf8')
      // Seul un APPEL à requireCmsAuth() protège une route. Avant, la simple mention de getCmsAuthStatus
      // suffisait : /api/cms/test-auth la citait sans rien bloquer, et révélait si un mot de passe était le bon.
      const guarded = /requireCmsAuth\(/.test(src)
      const allowed = route in PUBLIC_ROUTES
      expect(
        guarded || allowed,
        `${route} n'est ni protégée (requireCmsAuth) ni déclarée publique. Protégez-la, ou ajoutez-la à PUBLIC_ROUTES avec la raison.`,
      ).toBe(true)
    },
  )
})
