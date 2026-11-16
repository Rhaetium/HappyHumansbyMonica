/**
 * Contrôle du référencement page par page, pour l'onglet « 🩺 Référencement » du CMS.
 * Fonctions pures (sans React ni réseau) : testées dans __tests__/lib/seo-audit.test.ts.
 *
 * On contrôle ce que Google voit réellement (titre, description, image de partage publiés)
 * pour les pages ouvertes à Google. Une page volontairement cachée n'est pas une erreur.
 */
import { SERP_DESCRIPTION_MAX, SERP_TITLE_MAX, serpTitle } from '@/lib/seo-preview'

export type SeoPageInput = {
  page: string
  label: string
  title: string
  description: string
  image: string
  /** la page est ouverte à Google (réglage « Visibilité pages ») */
  indexable: boolean
}

export type SeoField = 'seo_title' | 'seo_description' | 'seo_image' | 'visibility'
export type SeoLevel = 'error' | 'warning' | 'info'

export type SeoIssue = {
  page: string
  label: string
  field: SeoField
  level: SeoLevel
  message: string
}

/** Description jugée trop courte pour donner envie de cliquer. */
export const DESCRIPTION_MIN = 70
/** Titre jugé trop court (hors marque) pour contenir un mot-clé utile. */
export const TITLE_MIN = 20

/** Pages légales : leur titre court et leur image par défaut sont normaux, on ne les commente pas. */
const LEGAL_PAGES = new Set(['mentions-legales', 'politique-confidentialite'])

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

export function auditSeo(pages: SeoPageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = []
  const add = (p: SeoPageInput, field: SeoField, level: SeoLevel, message: string) =>
    issues.push({ page: p.page, label: p.label, field, level, message })

  const open = pages.filter(p => p.indexable)

  // Titres et descriptions déjà utilisés par une autre page ouverte à Google
  const titleOwners = new Map<string, SeoPageInput[]>()
  const descOwners = new Map<string, SeoPageInput[]>()
  for (const p of open) {
    const t = norm(p.title)
    const d = norm(p.description)
    if (t) titleOwners.set(t, [...(titleOwners.get(t) ?? []), p])
    if (d) descOwners.set(d, [...(descOwners.get(d) ?? []), p])
  }
  const others = (list: SeoPageInput[] | undefined, p: SeoPageInput) =>
    (list ?? []).filter(o => o.page !== p.page).map(o => o.label).join(', ')

  for (const p of pages) {
    if (!p.indexable) {
      add(p, 'visibility', 'info', 'Cette page est cachée à Google (Paramètres → Visibilité pages). Normal si c’est voulu.')
      continue
    }

    // ── Titre ──
    const title = p.title.trim()
    if (!title) {
      add(p, 'seo_title', 'error', 'Aucun titre : Google en choisira un lui-même, rarement le bon.')
    } else {
      const shown = serpTitle(title)
      if (shown.length > SERP_TITLE_MAX) {
        add(p, 'seo_title', 'warning', `Titre trop long (${shown.length} caractères avec « | Happy Humans ») : Google coupera la fin après ${SERP_TITLE_MAX}.`)
      } else if (title.length < TITLE_MIN && !LEGAL_PAGES.has(p.page)) {
        add(p, 'seo_title', 'info', `Titre très court (${title.length} caractères) : ajoutez un mot-clé qui décrit la page.`)
      }
      const same = others(titleOwners.get(norm(title)), p)
      if (same) add(p, 'seo_title', 'warning', `Même titre que : ${same}. Chaque page doit avoir son propre titre.`)
    }

    // ── Description ──
    const description = p.description.trim()
    if (!description) {
      add(p, 'seo_description', 'warning', 'Aucune description : Google affichera un extrait au hasard du texte de la page.')
    } else {
      if (description.length > SERP_DESCRIPTION_MAX) {
        add(p, 'seo_description', 'warning', `Description trop longue (${description.length} caractères) : Google coupera la fin après ${SERP_DESCRIPTION_MAX}.`)
      } else if (description.length < DESCRIPTION_MIN) {
        add(p, 'seo_description', 'info', `Description courte (${description.length} caractères) : visez entre ${DESCRIPTION_MIN} et ${SERP_DESCRIPTION_MAX}.`)
      }
      const same = others(descOwners.get(norm(description)), p)
      if (same) add(p, 'seo_description', 'warning', `Même description que : ${same}.`)
    }
  }

  // ── Image de partage : une seule remarque pour toutes les pages concernées (pas une ligne par page) ──
  const noImage = open.filter(p => !p.image.trim() && !LEGAL_PAGES.has(p.page))
  if (noImage.length > 0) {
    const names = noImage.map(p => p.label).join(', ')
    add(noImage[0], 'seo_image', 'info', `Pas d’image de partage propre à : ${names}. L’image du site est utilisée sur Facebook, LinkedIn et WhatsApp.`)
  }

  const rank: Record<SeoLevel, number> = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => rank[a.level] - rank[b.level])
}

/** Nombre de points qui demandent une action (erreurs et avertissements ; les infos sont facultatives). */
export function actionableCount(issues: SeoIssue[]): number {
  return issues.filter(i => i.level !== 'info').length
}
