// Liens cassés vers les pages du site : un lien interne (« /coaching », « /blog/mon-article ») qui ne mène nulle part
// donne une erreur 404 au visiteur et fait perdre du référencement. On cherche ces liens dans les boutons des pages,
// les textes enrichis, les pages libres et les articles. Les liens externes (https://autre-site) ne sont pas testés ici :
// il faudrait les ouvrir un par un. Logique pure, testée dans __tests__/lib/link-audit.test.ts.

import { LIVE_ROUTES, normalizePath } from '@/lib/redirects'

export type LinkSource = {
  /** Où se trouve le lien, en clair : « Page Coaching — Bouton principal » ou « Article « Titre » ». */
  where: string
  /** Onglet de l'admin pour le corriger. */
  tab: 'pages' | 'articles' | 'custom-pages'
  /** Texte contenant le(s) lien(s) : une adresse seule (champ « …_href »), du HTML ou du JSON contenant du HTML. */
  value: string
  /** Vrai si `value` est directement une adresse (champ « …_href »). */
  isHref?: boolean
}

export type BrokenLink = { where: string; tab: LinkSource['tab']; href: string }

const HREF_RE = /href=\\?["']([^"'\\]+)/gi

/** Toutes les adresses de liens d'un morceau de HTML (ou de JSON contenant du HTML). */
export function extractHrefs(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(HREF_RE)) out.push(m[1].trim())
  return out
}

/** Chemin interne normalisé d'une adresse, ou null si ce n'est pas un lien vers une page du site (externe, mail, ancre seule…). */
export function internalPath(href: string, siteUrl: string): string | null {
  const h = href.trim()
  if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(h)) return null
  if (/^https?:\/\//i.test(h)) {
    try {
      const site = new URL(siteUrl).hostname.replace(/^www\./, '')
      const url = new URL(h)
      if (url.hostname.replace(/^www\./, '') !== site) return null
      return normalizePath(url.pathname)
    } catch { return null }
  }
  if (h.startsWith('//')) return null
  if (!h.startsWith('/')) return null
  return normalizePath(h)
}

export type KnownPaths = { exact: Set<string>; prefixes: string[] }

/** Les adresses qui existent : pages fixes, articles publiés, pages libres, anciennes adresses redirigées. */
export function buildKnownPaths(input: { articleSlugs: string[]; customPagePaths: string[]; redirectFrom: string[] }): KnownPaths {
  const exact = new Set<string>(LIVE_ROUTES.map(normalizePath))
  for (const slug of input.articleSlugs) exact.add(normalizePath(`/blog/${slug}`))
  for (const p of input.customPagePaths) exact.add(normalizePath(p))
  for (const f of input.redirectFrom) exact.add(normalizePath(f))
  // Fichiers et zones techniques toujours valides
  return { exact, prefixes: ['/api/', '/_next/', '/images/', '/uploads/', '/cms-admin'] }
}

export function isKnownPath(path: string, known: KnownPaths): boolean {
  if (known.exact.has(path)) return true
  // Un fichier (adresse avec extension : image, PDF…) n'est pas une page : on ne peut pas le juger ici
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return true
  return known.prefixes.some(p => path.startsWith(p))
}

export function auditLinks(sources: LinkSource[], known: KnownPaths, siteUrl: string): BrokenLink[] {
  const broken: BrokenLink[] = []
  const seen = new Set<string>()
  for (const s of sources) {
    const hrefs = s.isHref ? [s.value] : extractHrefs(s.value)
    for (const href of hrefs) {
      const path = internalPath(href, siteUrl)
      if (path === null || isKnownPath(path, known)) continue
      const id = `${s.where}\u0000${path}`
      if (seen.has(id)) continue
      seen.add(id)
      broken.push({ where: s.where, tab: s.tab, href: href.trim() })
    }
  }
  return broken
}
