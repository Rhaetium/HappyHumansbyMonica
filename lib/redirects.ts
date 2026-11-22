// Redirections gérées depuis l'admin (onglet « Redirections »). Logique pure, testée dans __tests__/lib/redirects.test.ts.
//
// Pourquoi : quand Monica renomme une page ou un article, l'ancienne adresse doit renvoyer vers la nouvelle (code 301),
// sinon les visiteurs et Google tombent sur une erreur 404 et le référencement se perd.
//
// Stockage : un seul champ du CMS (table site_content, page « settings », clé « redirects »), en JSON
// `[{ "from": "/ancienne-page", "to": "/nouvelle-page" }, …]`. Aucune migration SQL.

export type RedirectRule = { from: string; to: string }

export const REDIRECTS_PAGE = 'settings'
export const REDIRECTS_KEY = 'redirects'
export const MAX_REDIRECTS = 500

/** Adresses qui ne peuvent jamais être redirigées (technique, admin, fichiers de référencement). */
const PROTECTED_PREFIXES = ['/api', '/_next', '/cms-admin', '/admin', '/auth']
const PROTECTED_FILES = ['/sitemap.xml', '/robots.txt', '/llms.txt']

/** Pages du site qui existent : une redirection depuis l'une d'elles la ferait disparaître. */
export const LIVE_ROUTES = [
  '/', '/a-propos', '/coaching', '/entreprises', '/happiness-design', '/sparring-partner', '/relations',
  '/blog', '/faq', '/contact', '/booking', '/mentions-legales', '/politique-confidentialite', '/merci',
]

/** Adresse sans domaine, sans paramètres, sans « / » final, en minuscules. « /Blog/ » → « /blog ». */
export function normalizePath(input: string): string {
  let p = (input ?? '').trim()
  p = p.replace(/^https?:\/\/[^/]+/i, '') // un domaine collé par erreur
  p = p.split('#')[0].split('?')[0]
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/{2,}/g, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  try { p = decodeURI(p) } catch { /* adresse déjà lisible */ }
  return p.toLowerCase()
}

/** Destination : une adresse du site (« /coaching ») ou un lien complet (« https://… »). Les paramètres sont conservés. */
export function normalizeTarget(input: string): string {
  const t = (input ?? '').trim()
  if (/^https:\/\//i.test(t)) return t
  const hash = t.includes('#') ? t.slice(t.indexOf('#')) : ''
  const noHash = t.split('#')[0]
  const query = noHash.includes('?') ? noHash.slice(noHash.indexOf('?')) : ''
  const path = normalizePath(noHash.split('?')[0])
  return path + query + hash
}

export function isExternalTarget(to: string): boolean {
  return /^https:\/\//i.test(to)
}

function isProtected(path: string): boolean {
  return PROTECTED_FILES.includes(path) || PROTECTED_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))
}

/** Lit le JSON stocké ; tolère un champ vide ou abîmé (renvoie une liste vide, le site ne casse jamais). */
export function parseRedirects(raw: string | null | undefined): RedirectRule[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const rules: RedirectRule[] = []
    for (const r of data) {
      if (r && typeof r.from === 'string' && typeof r.to === 'string' && r.from.trim() && r.to.trim()) {
        rules.push({ from: normalizePath(r.from), to: normalizeTarget(r.to) })
      }
    }
    return rules.slice(0, MAX_REDIRECTS)
  } catch {
    return []
  }
}

export type RedirectProblem = { index: number; level: 'error' | 'warning'; message: string }

/**
 * Contrôle une liste avant enregistrement. Une « error » empêche l'enregistrement ; un « warning » est affiché
 * (ex. l'adresse d'origine est une page qui existe : elle ne s'afficherait plus).
 */
export function checkRedirects(rules: RedirectRule[]): RedirectProblem[] {
  const problems: RedirectProblem[] = []
  const add = (index: number, level: 'error' | 'warning', message: string) => problems.push({ index, level, message })
  const seen = new Map<string, number>()
  const map = new Map(rules.map(r => [normalizePath(r.from), normalizeTarget(r.to)]))

  if (rules.length > MAX_REDIRECTS) add(-1, 'error', `Maximum ${MAX_REDIRECTS} redirections.`)

  rules.forEach((r, i) => {
    const from = normalizePath(r.from)
    const to = normalizeTarget(r.to)
    if (!r.from.trim()) add(i, 'error', 'Adresse d’origine vide.')
    else if (from === '/') add(i, 'error', 'La page d’accueil ne peut pas être redirigée.')
    if (!r.to.trim()) add(i, 'error', 'Destination vide.')
    if (isProtected(from)) add(i, 'error', `« ${from} » est réservée au fonctionnement du site.`)
    if (!isExternalTarget(to) && normalizePath(to.split(/[?#]/)[0]) === from) add(i, 'error', 'L’origine et la destination sont identiques.')
    if (/^http:\/\//i.test(r.to.trim())) add(i, 'error', 'Un lien externe doit commencer par https://.')
    if (seen.has(from)) add(i, 'error', `« ${from} » est déjà redirigée (ligne ${seen.get(from)! + 1}).`)
    else seen.set(from, i)
    if (LIVE_ROUTES.includes(from)) add(i, 'warning', `« ${from} » est une page du site : elle ne s’afficherait plus.`)
    if (!isExternalTarget(to) && isProtected(normalizePath(to.split(/[?#]/)[0]))) add(i, 'error', 'La destination ne peut pas être une adresse réservée.')

    // Boucle ou chaîne : on suit la destination tant qu'elle est elle-même redirigée
    let cur = to
    const path = new Set([from])
    let hops = 0
    while (!isExternalTarget(cur) && normalizePath(to.split(/[?#]/)[0]) !== from && map.has(normalizePath(cur.split(/[?#]/)[0]))) {
      const key = normalizePath(cur.split(/[?#]/)[0])
      if (path.has(key)) { add(i, 'error', 'Boucle : ces redirections se renvoient l’une à l’autre.'); break }
      path.add(key)
      cur = map.get(key)!
      hops += 1
      if (hops === 1) add(i, 'warning', `Chaîne : « ${to} » est elle-même redirigée. Pointez directement vers la page finale.`)
      if (hops > 5) { add(i, 'error', 'Chaîne trop longue.'); break }
    }
  })
  return problems
}

/**
 * La destination pour une adresse demandée, ou null. Suit au plus 5 redirections (une chaîne reste ainsi un seul saut
 * pour le visiteur). Les paramètres de l'adresse demandée sont conservés quand la destination n'en a pas.
 */
export function resolveRedirect(rules: RedirectRule[], pathname: string, search = ''): string | null {
  if (rules.length === 0) return null
  const map = new Map(rules.map(r => [normalizePath(r.from), r.to]))
  const start = normalizePath(pathname)
  if (isProtected(start)) return null
  let target = map.get(start)
  if (!target) return null
  const visited = new Set([start])
  for (let i = 0; i < 5 && !isExternalTarget(target); i++) {
    const key = normalizePath(target.split(/[?#]/)[0])
    const next = map.get(key)
    if (!next || visited.has(key)) break
    visited.add(key)
    target = next
  }
  if (search && !target.includes('?')) {
    const hash = target.indexOf('#')
    target = hash === -1 ? target + search : target.slice(0, hash) + search + target.slice(hash)
  }
  return target
}
