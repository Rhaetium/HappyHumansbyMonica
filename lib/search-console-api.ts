/**
 * Google Search Console — statistiques réelles (niveau 2).
 *
 * Niveau 1 (`lib/search-console.ts`) vérifie seulement que le site *appartient* à Monica.
 * Ici on interroge l'API pour obtenir les chiffres : clics, impressions, position, et les
 * requêtes/pages qui les produisent.
 *
 * Authentification : **compte de service** (pas d'OAuth interactif). Monica crée un compte de
 * service dans Google Cloud, l'ajoute comme utilisateur de la propriété Search Console, et colle
 * deux valeurs dans Vercel (voir `.env.example`). Le site fabrique alors un JWT signé RS256,
 * l'échange contre un jeton d'accès, puis appelle `searchAnalytics/query`.
 *
 * La clé privée ne quitte jamais le serveur : seule la route `/api/cms/search-console/stats`
 * l'utilise, et jamais dans une réponse.
 *
 * Logique pure et testée (`__tests__/lib/search-console-api.test.ts`) : signature JWT réelle,
 * échange de jeton et requête testés contre un vrai serveur HTTP local.
 */

import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://www.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type GscCredentials = {
  clientEmail: string
  /** Clé PEM. Dans Vercel, les retours à la ligne sont souvent écrits « \n » : on les restaure. */
  privateKey: string
}

export type GscRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type GscTotals = {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type GscStats = {
  period: { startDate: string; endDate: string; days: number }
  totals: GscTotals
  topQueries: GscRow[]
  topPages: GscRow[]
}

/** Erreur lisible : `message` est montré à Monica, `hint` dit quoi faire. */
export class SearchConsoleApiError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'SearchConsoleApiError'
    this.hint = hint
  }
}

/**
 * Lit les identifiants du compte de service.
 *
 * Renvoie `null` si l'un des deux manque : l'appelant affiche alors « non connecté » au lieu
 * d'une erreur, car c'est un état normal tant que Monica n'a pas terminé l'installation.
 */
export function loadGscCredentials(env: Record<string, string | undefined> = process.env): GscCredentials | null {
  const clientEmail = env.GSC_SERVICE_ACCOUNT_EMAIL?.trim()
  const rawKey = env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  if (!clientEmail || !rawKey) return null

  // Vercel stocke la clé sur une ligne : « -----BEGIN...\nMIIE...\n-----END... ».
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey
  return { clientEmail, privateKey }
}

/** Base64url sans remplissage, comme l'exige la RFC 7515. */
function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Fabrique l'assertion JWT signée RS256 qui prouve l'identité du compte de service.
 * `nowSeconds` est injectable pour que les tests soient déterministes.
 */
export function buildAssertionJwt(input: {
  clientEmail: string
  privateKey: string
  nowSeconds?: number
  scope?: string
  audience?: string
}): string {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: input.clientEmail,
      scope: input.scope ?? SCOPE,
      aud: input.audience ?? TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const signature = base64url(signer.sign(input.privateKey))
  return `${header}.${claims}.${signature}`
}

/** Échange l'assertion contre un jeton d'accès (durée 1 h, non conservé). */
export async function exchangeAssertionForToken(input: {
  assertion: string
  tokenUrl?: string
  fetchImpl?: FetchLike
}): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch
  const res = await fetchImpl(input.tokenUrl ?? TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: input.assertion,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // 400 invalid_grant = compte de service absent de la propriété : cause n°1 en pratique.
    if (res.status === 400 && body.includes('invalid_grant')) {
      throw new SearchConsoleApiError(
        'Google a refusé le compte de service.',
        'Vérifiez que l’adresse du compte de service est bien ajoutée comme utilisateur ' +
          'de la propriété dans Search Console (Paramètres → Utilisateurs et autorisations).',
      )
    }
    throw new SearchConsoleApiError(
      `Google a refusé la connexion (${res.status}).`,
      'Vérifiez l’adresse du compte de service et la clé privée dans Vercel.',
    )
  }

  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new SearchConsoleApiError('Google n’a pas renvoyé de jeton d’accès.')
  }
  return data.access_token
}

/** Date au format `AAAA-MM-JJ` attendu par l'API. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Fenêtre analysée. Search Console ignore les données des 2 derniers jours (délai de collecte),
 * donc `endDate` s'arrête à J-2 : sinon les chiffres paraîtraient anormalement bas.
 */
export function periodRange(days: number, today: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() - 2)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

function parseRows(json: unknown): GscRow[] {
  const rows = (json as { rows?: unknown[] })?.rows
  if (!Array.isArray(rows)) return []
  return rows.map(r => {
    const row = r as { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
    return {
      keys: row.keys ?? [],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }
  })
}

/** Interroge l'API pour une dimension donnée (`query` ou `page`). */
export async function querySearchAnalytics(input: {
  accessToken: string
  siteUrl: string
  startDate: string
  endDate: string
  dimension: 'query' | 'page'
  rowLimit?: number
  apiUrl?: string
  fetchImpl?: FetchLike
}): Promise<GscRow[]> {
  const fetchImpl = input.fetchImpl ?? fetch
  const base = input.apiUrl ?? API_BASE
  const url = `${base}/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: [input.dimension],
      rowLimit: input.rowLimit ?? 25,
      type: 'web',
    }),
  })

  if (res.status === 403) {
    throw new SearchConsoleApiError(
      'La propriété Search Console n’est pas accessible.',
      'Vérifiez que l’adresse de la propriété correspond exactement (avec ou sans « / » final) ' +
        'et que le compte de service y a accès.',
    )
  }
  if (!res.ok) {
    throw new SearchConsoleApiError(`Search Console a renvoyé une erreur (${res.status}).`)
  }

  return parseRows(await res.json())
}

/** Additionne les lignes d'une même dimension pour obtenir les totaux de la période. */
export function summarizeRows(rows: GscRow[]): GscTotals {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0)
  const impressions = rows.reduce((s, r) => s + r.impressions, 0)
  // La position moyenne pondérée par les impressions est la seule qui ait un sens.
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0)
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weighted / impressions : 0,
  }
}

/**
 * Récupère les statistiques complètes : totaux + principales requêtes + principales pages.
 * Une seule obtention de jeton pour les deux requêtes.
 */
export async function fetchSearchConsoleStats(input: {
  credentials: GscCredentials
  siteUrl: string
  days: number
  today?: Date
  rowLimit?: number
  tokenUrl?: string
  apiUrl?: string
  fetchImpl?: FetchLike
}): Promise<GscStats> {
  const { startDate, endDate } = periodRange(input.days, input.today)
  const assertion = buildAssertionJwt({
    clientEmail: input.credentials.clientEmail,
    privateKey: input.credentials.privateKey,
    audience: input.tokenUrl ?? TOKEN_URL,
  })
  const accessToken = await exchangeAssertionForToken({
    assertion,
    tokenUrl: input.tokenUrl,
    fetchImpl: input.fetchImpl,
  })

  const common = {
    accessToken,
    siteUrl: input.siteUrl,
    startDate,
    endDate,
    rowLimit: input.rowLimit,
    apiUrl: input.apiUrl,
    fetchImpl: input.fetchImpl,
  }

  const [topQueries, topPages] = await Promise.all([
    querySearchAnalytics({ ...common, dimension: 'query' }),
    querySearchAnalytics({ ...common, dimension: 'page' }),
  ])

  return {
    period: { startDate, endDate, days: input.days },
    totals: summarizeRows(topQueries),
    topQueries,
    topPages,
  }
}
