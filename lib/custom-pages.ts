// ── Pages libres créées depuis le CMS ────────────────────────────────
// Monica crée des pages entières (nouvelle adresse /p/<slug>, titre, accroche,
// blocs, SEO) sans intervention technique.
//
// Stockage : UN SEUL enregistrement de `site_content` — page « custom-pages »,
// bloc « pages » — dont la valeur est le tableau JSON de toutes les pages.
// Comme tout le reste du CMS, il se lit via /api/cms/content et s'écrit via
// PUT /api/cms/content : aucune migration SQL n'est nécessaire.
//
// Fichier SANS dépendance (ni React, ni Next, ni Supabase) : partagé par la page
// publique, l'admin et les tests.

import { makeId, parseBlocks, type CustomBlock } from './custom-sections'

export const CUSTOM_PAGES_PAGE = 'custom-pages'
export const CUSTOM_PAGES_KEY = 'pages'
export const CUSTOM_PAGE_PREFIX = '/p/'

export type CustomPage = {
  id: string
  slug: string
  title: string
  intro: string
  /** En ligne : visible par les visiteurs. Hors ligne : seul l'admin la voit. */
  published: boolean
  blocks: CustomBlock[]
  seoTitle: string
  seoDescription: string
  seoImage: string
}

/** Adresse publique d'une page libre. */
export function pageHref(slug: string): string {
  return `${CUSTOM_PAGE_PREFIX}${slug}`
}

/**
 * Adresse lisible à partir d'un titre : « Nos ateliers 2026 » → « nos-ateliers-2026 ».
 * Accents retirés, tout ce qui n'est pas lettre/chiffre devient un tiret.
 */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Un slug ne peut contenir que a-z, 0-9 et des tirets simples. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

/** Slug libre : ajoute -2, -3… si l'adresse est déjà prise (sauf pour la page en cours d'édition). */
export function uniqueSlug(pages: CustomPage[], slug: string, exceptId?: string): string {
  const base = slugify(slug) || 'page'
  const taken = new Set(pages.filter(p => p.id !== exceptId).map(p => p.slug))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

let counter = 0
function newId(): string {
  counter += 1
  return `p${Date.now().toString(36)}${counter.toString(36)}`
}

/** Nouvelle page vierge avec une adresse libre. */
export function blankPage(pages: CustomPage[]): CustomPage {
  return {
    id: newId(),
    slug: uniqueSlug(pages, 'nouvelle-page'),
    title: 'Nouvelle page',
    intro: '',
    published: false,
    blocks: [],
    seoTitle: '',
    seoDescription: '',
    seoImage: '',
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** Normalise une entrée lue en base (champ manquant, type inattendu…). */
function normalize(raw: unknown): CustomPage | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.slug !== 'string') return null
  const slug = slugify(r.slug)
  if (!isValidSlug(slug)) return null
  return {
    id: r.id,
    slug,
    title: str(r.title),
    intro: str(r.intro),
    published: r.published === true || r.published === 'true',
    blocks: Array.isArray(r.blocks) ? parseBlocks(JSON.stringify(r.blocks)) : [],
    seoTitle: str(r.seoTitle),
    seoDescription: str(r.seoDescription),
    seoImage: str(r.seoImage),
  }
}

/** Lit le JSON du CMS ; invalide → [] (le site ne casse jamais). */
export function parsePages(json?: string | null): CustomPage[] {
  if (!json || !json.trim()) return []
  try {
    const v = JSON.parse(json)
    if (!Array.isArray(v)) return []
    const seen = new Set<string>()
    const pages: CustomPage[] = []
    for (const raw of v) {
      const p = normalize(raw)
      if (!p || seen.has(p.slug)) continue // deux pages ne peuvent pas partager la même adresse
      seen.add(p.slug)
      pages.push(p)
    }
    return pages
  } catch {
    return []
  }
}

/** Valeur à enregistrer en base ('' = plus aucune page). */
export function serializePages(pages: CustomPage[]): string {
  return pages.length === 0 ? '' : JSON.stringify(pages)
}

export function findPage(pages: CustomPage[], slug: string): CustomPage | undefined {
  return pages.find(p => p.slug === slug)
}

/** Page visible par les visiteurs (une page hors ligne est introuvable, donc 404). */
export function findPublishedPage(pages: CustomPage[], slug: string): CustomPage | undefined {
  const p = findPage(pages, slug)
  return p && p.published ? p : undefined
}

export function upsertPage(pages: CustomPage[], page: CustomPage): CustomPage[] {
  const clean: CustomPage = {
    ...page,
    slug: uniqueSlug(pages, page.slug, page.id),
    blocks: page.blocks.map(b => ({ ...b })),
  }
  const i = pages.findIndex(p => p.id === page.id)
  if (i < 0) return [...pages, clean]
  const next = [...pages]
  next[i] = clean
  return next
}

export function removePage(pages: CustomPage[], id: string): CustomPage[] {
  return pages.filter(p => p.id !== id)
}

/** Déplace une page dans la liste de l'admin (présentation seulement). */
export function movePage(pages: CustomPage[], id: string, dir: -1 | 1): CustomPage[] {
  const i = pages.findIndex(p => p.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= pages.length) return pages
  const next = [...pages]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Résumé pour la liste de l'admin. */
export function pageSummary(page: CustomPage): string {
  const parts = [`${page.blocks.length} bloc${page.blocks.length > 1 ? 's' : ''}`]
  if (!page.published) parts.push('hors ligne')
  return parts.join(' · ')
}

/**
 * Copie une page pour en faire un modèle : nouvel identifiant, adresse libre (titre-copie), titre « … (copie) »,
 * HORS LIGNE (on ne publie jamais une copie par surprise), blocs copiés en profondeur avec de nouveaux identifiants,
 * insérée juste après l'original. Page inconnue : liste inchangée.
 */
export function duplicatePage(pages: CustomPage[], id: string): CustomPage[] {
  const i = pages.findIndex(p => p.id === id)
  if (i < 0) return pages
  const src = pages[i]
  const copy: CustomPage = {
    ...JSON.parse(JSON.stringify(src)),
    id: newId(),
    slug: uniqueSlug(pages, `${src.slug}-copie`),
    title: `${src.title || 'Page'} (copie)`,
    published: false,
    blocks: src.blocks.map(b => ({ ...JSON.parse(JSON.stringify(b)), id: makeId() })),
  }
  return [...pages.slice(0, i + 1), copy, ...pages.slice(i + 1)]
}
