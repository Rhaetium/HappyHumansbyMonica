/**
 * Aperçu « résultat Google » d'une page : ce que le visiteur verra vraiment dans la recherche.
 * Fonctions pures (sans React) : utilisées par l'admin du CMS et testées.
 */
import { BRAND_NAME, stripBrandSuffix } from '@/lib/site-seo'

/** Longueurs au-delà desquelles Google coupe le texte (repère courant, pas une règle officielle). */
export const SERP_TITLE_MAX = 60
export const SERP_DESCRIPTION_MAX = 160

/**
 * Titre tel qu'il s'affiche dans Google : le gabarit du site ajoute « | Happy Humans », sauf s'il y est déjà
 * (la marque en fin de titre n'est jamais doublée). Chaîne vide si aucun titre n'est saisi.
 */
export function serpTitle(title: string | null | undefined): string {
  const clean = stripBrandSuffix(title)
  return clean ? `${clean} | ${BRAND_NAME}` : ''
}

/** Texte coupé comme le ferait Google : au-delà de `max` caractères, on termine par « … ». */
export function truncateForSerp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/** Adresse affichée sous le titre : « domaine › page » (comme dans Google). Le domaine vient de SITE_URL. */
export function serpBreadcrumb(siteUrl: string, path: string): string {
  let host = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  try {
    host = new URL(siteUrl).host
  } catch {
    /* adresse invalide : on garde le texte tel quel */
  }
  const parts = path.split('/').filter(Boolean)
  return [host, ...parts].join(' › ')
}
