/**
 * Carte du contenu : index de TOUS les textes éditables du site.
 *
 * Sert à l'onglet « 🔎 Contenu » de l'admin : chercher un texte parmi toutes les pages,
 * voir ce qui a été personnalisé par rapport aux textes d'origine, et ce qui attend
 * d'être publié (brouillons).
 *
 * Fichier SANS dépendance (ni React ni Next) : partagé par l'admin et testé seul.
 */

import { basePage, isDraftPage } from './cms-drafts'
import { LIST_DEFS, listItemName, readList, serializeList, type ListDef, type ListItem } from './cms-lists'

/** Un champ tel que déclaré dans `PAGES_CONFIG` (components/cms/admin/config.ts). */
export type ContentFieldDef = {
  page: string
  pageLabel: string
  emoji: string
  /** clé du champ dans `site_content` */
  key: string
  /** libellé complet : « Groupe — Libellé » */
  label: string
  type: string
}

/** Une ligne de `site_content` (publiée, ou brouillon avec `page = "draft:<page>"`). */
export type ContentRow = { page: string; block_key: string; value: string | null }

export type ContentField = ContentFieldDef & {
  /** partie du libellé avant le « — », « Général » sinon */
  group: string
  /** partie du libellé après le « — » */
  shortLabel: string
  /** texte d'origine (lib/cms-defaults) */
  defaultValue: string
  /** ce que voit un visiteur : valeur en base si elle existe, sinon le texte d'origine */
  publishedValue: string
  /** valeur du brouillon ; `null` quand aucun brouillon n'existe pour ce champ */
  draftValue: string | null
  /** ce que l'admin affiche : brouillon, sinon publié */
  effectiveValue: string
  /** une valeur personnalisée est enregistrée en base (donc l'originale est remplacée) */
  isCustom: boolean
  /** un brouillon existe (même s'il est identique au publié) */
  hasDraft: boolean
  /** le brouillon diffère de la valeur en ligne : il attend une publication */
  isPending: boolean
  /**
   * Cartes d'une liste (`type: 'list'`) telles que la page les lit : JSON enregistré, sinon les
   * anciens champs numérotés. Permet de chercher et de remplacer à l'intérieur des cartes.
   */
  listItems?: ListItem[]
}

export type ContentFilter = 'all' | 'custom' | 'pending'

export type PageContentStats = {
  page: string
  pageLabel: string
  emoji: string
  total: number
  customized: number
  pending: number
}

export type ContentStats = {
  fields: number
  pages: number
  customized: number
  pending: number
  pagesWithPending: number
}

const GROUP_SEPARATOR = '—'

/** « Structure — Ordre des sections » → { group: 'Structure', shortLabel: 'Ordre des sections' } */
export function labelParts(label: string): { group: string; shortLabel: string } {
  if (!label.includes(GROUP_SEPARATOR)) return { group: 'Général', shortLabel: label }
  const [group, ...rest] = label.split(GROUP_SEPARATOR)
  return { group: group.trim(), shortLabel: rest.join(GROUP_SEPARATOR).trim() }
}

/**
 * Types dont la valeur est du texte lisible : seuls ceux-là sont cherchés dans le contenu.
 * Les listes, blocs et réglages de structure sont du JSON : les chercher mélangerait
 * de la syntaxe au milieu des résultats (ils restent trouvables par leur libellé).
 */
const TEXTUAL_TYPES = new Set(['text', 'textarea', 'richtext', 'select'])

export const isTextualField = (type: string) => TEXTUAL_TYPES.has(type)

/** Un champ « liste » : ses textes vivent dans ses cartes, pas dans sa valeur (du JSON). */
export const isListField = (field: ContentField) => !!field.listItems

/** Clé de rapprochement d'une ligne de contenu. */
const rowKey = (page: string, key: string) => `${page}\u0000${key}`

/**
 * Construit l'index complet. `rows` peut contenir les brouillons (`draft:<page>`) :
 * ils sont rangés à part, jamais mélangés aux valeurs en ligne.
 */
export function buildContentIndex(
  defs: ContentFieldDef[],
  rows: ContentRow[],
  defaults: Record<string, Record<string, string>>,
): ContentField[] {
  const published = new Map<string, string>()
  const drafts = new Map<string, string>()

  for (const row of rows) {
    const value = row.value ?? ''
    if (isDraftPage(row.page)) drafts.set(rowKey(basePage(row.page), row.block_key), value)
    else published.set(rowKey(row.page, row.block_key), value)
  }

  // Contenu complet de chaque page, tel que la page le lit : textes d'origine + valeurs enregistrées,
  // puis brouillons par-dessus. Indispensable pour relire une liste : quand aucun JSON n'a été
  // enregistré, ses cartes viennent des anciens champs numérotés (program_1_label, faq_1_q…).
  const pageContent = new Map<string, Record<string, string>>()
  const contentOf = (page: string) => {
    let content = pageContent.get(page)
    if (!content) {
      content = { ...(defaults[page] ?? {}) }
      pageContent.set(page, content)
    }
    return content
  }
  for (const [key, value] of published) {
    const cut = key.indexOf('\u0000')
    contentOf(key.slice(0, cut))[key.slice(cut + 1)] = value
  }
  for (const [key, value] of drafts) {
    const cut = key.indexOf('\u0000')
    contentOf(key.slice(0, cut))[key.slice(cut + 1)] = value
  }

  return defs.map(def => {
    const { group, shortLabel } = labelParts(def.label)
    const id = rowKey(def.page, def.key)
    const defaultValue = defaults[def.page]?.[def.key] ?? ''
    // Une valeur vide en base ne « personnalise » rien : le site retombe sur le texte d'origine.
    const stored = published.get(id)
    const isCustom = typeof stored === 'string' && stored.trim() !== ''
    const publishedValue = isCustom ? (stored as string) : defaultValue
    const hasDraft = drafts.has(id)
    const draftValue = hasDraft ? (drafts.get(id) as string) : null
    const def0 = def.type === 'list' ? LIST_DEFS[def.key] : undefined
    return {
      ...def,
      group,
      shortLabel,
      defaultValue,
      publishedValue,
      draftValue,
      effectiveValue: hasDraft ? (draftValue as string) : publishedValue,
      isCustom,
      hasDraft,
      isPending: hasDraft && draftValue !== publishedValue,
      ...(def0 ? { listItems: readList(contentOf(def.page), def.key) } : {}),
    }
  })
}

/** Minuscules sans accents : « Témoignages » se cherche avec « temoignages ». */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Plie le texte en gardant, pour chaque caractère produit, sa position dans l'original.
 * Sert à découper un extrait centré sur la correspondance malgré les accents.
 */
function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < s.length; i++) {
    const piece = fold(s[i])
    for (const ch of piece) {
      folded += ch
      map.push(i)
    }
  }
  return { folded, map }
}

/** Extrait de texte autour de la correspondance, avec « … » quand on coupe. */
export function valueSnippet(value: string, query: string, before = 40, after = 90): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  const q = fold(query).trim()
  if (!q) return flat.length > before + after ? `${flat.slice(0, before + after).trimEnd()}…` : flat
  const { folded, map } = foldWithMap(flat)
  const at = folded.indexOf(q)
  if (at < 0) return flat.length > before + after ? `${flat.slice(0, before + after).trimEnd()}…` : flat
  const end = at + q.length - 1
  const startIndex = Math.max(0, (map[at] ?? 0) - before)
  const endIndex = Math.min(flat.length, (map[end] ?? flat.length - 1) + after)
  return `${startIndex > 0 ? '…' : ''}${flat.slice(startIndex, endIndex).trim()}${endIndex < flat.length ? '…' : ''}`
}

/**
 * Champs visibles dans l'onglet « Contenu » : filtre (personnalisés / en attente)
 * puis recherche insensible à la casse et aux accents dans le libellé, la clé,
 * le nom de la page et — pour les champs textuels — la valeur affichée. Les cartes
 * d'une liste sont cherchées carte par carte (jamais dans la syntaxe JSON).
 */
export function searchContent(
  index: ContentField[],
  query: string,
  filter: ContentFilter = 'all',
): ContentField[] {
  const q = fold(query).trim()
  return index.filter(field => {
    if (filter === 'custom' && !field.isCustom) return false
    if (filter === 'pending' && !field.isPending) return false
    if (!q) return true
    if (fold(field.pageLabel).includes(q)) return true
    if (fold(field.label).includes(q)) return true
    if (fold(field.key).includes(q)) return true
    if (isTextualField(field.type) && fold(field.effectiveValue).includes(q)) return true
    if (isListField(field) && cardMatches(field, query).length > 0) return true
    return false
  })
}

/** Une carte dont un texte contient la recherche. */
export type CardMatch = {
  /** position de la carte dans la liste */
  index: number
  /** « Question 3 — Quels sont les tarifs ? » */
  name: string
  /** libellé du sous-champ touché (« Réponse ») */
  fieldLabel: string
  /** extrait centré sur la correspondance */
  snippet: string
}

/** Champs d'une carte qui contiennent du texte lisible (pas d'icône, pas de lien). */
export const isReplaceableListField = (f: { type?: string; noReplace?: boolean }) =>
  f.type !== 'select' && !f.noReplace

/**
 * Textes des cartes d'une liste qui contiennent `query`. Sert à la fois à la recherche
 * (on trouve « yoga » dans une réponse de la FAQ) et à l'aperçu du remplacement.
 */
export function cardMatches(field: ContentField, query: string, limit = 3): CardMatch[] {
  const def: ListDef | undefined = LIST_DEFS[field.key]
  const items = field.listItems
  const q = fold(query).trim()
  if (!def || !items?.length || !q) return []
  const matches: CardMatch[] = []
  for (let i = 0; i < items.length && matches.length < limit; i++) {
    for (const f of def.fields) {
      if (!isReplaceableListField(f)) continue
      const value = items[i][f.key] ?? ''
      if (!fold(value).includes(q)) continue
      matches.push({ index: i, name: listItemName(def, items[i], i), fieldLabel: f.label, snippet: valueSnippet(value, query) })
      if (matches.length >= limit) break
    }
  }
  return matches
}

/** Compteurs globaux affichés en haut de l'onglet. */
export function contentStats(index: ContentField[]): ContentStats {
  const pages = new Set<string>()
  const pagesWithPending = new Set<string>()
  let customized = 0
  let pending = 0
  for (const field of index) {
    pages.add(field.page)
    if (field.isCustom) customized++
    if (field.isPending) {
      pending++
      pagesWithPending.add(field.page)
    }
  }
  return { fields: index.length, pages: pages.size, customized, pending, pagesWithPending: pagesWithPending.size }
}

/** Compteurs page par page, dans l'ordre fourni par l'index. */
export function pageStats(index: ContentField[]): PageContentStats[] {
  const byPage = new Map<string, PageContentStats>()
  for (const field of index) {
    const row = byPage.get(field.page) ?? {
      page: field.page,
      pageLabel: field.pageLabel,
      emoji: field.emoji,
      total: 0,
      customized: 0,
      pending: 0,
    }
    row.total++
    if (field.isCustom) row.customized++
    if (field.isPending) row.pending++
    byPage.set(field.page, row)
  }
  return [...byPage.values()]
}

/** Id du conteneur d'un champ dans l'onglet Pages : permet d'y amener l'utilisateur. */
export const fieldAnchor = (page: string, key: string) => `field-${page}-${key}`

// ── Remplacer un mot dans plusieurs textes ───────────────────────────────────
//
// Seuls les champs de texte libre sont concernés : remplacer dans un `select` (« oui »/« non »),
// une image (une URL) ou le JSON d'une liste n'aurait pas de sens. Les cartes (programmes, FAQ…)
// se modifient dans leur éditeur de liste.

const REPLACEABLE_TYPES = new Set(['text', 'textarea', 'richtext'])

export const isReplaceableField = (type: string) => REPLACEABLE_TYPES.has(type)

/**
 * Conserve la majuscule initiale : « Organisations » remplacé par « entreprises » donne
 * « Entreprises », pas « entreprises » en plein milieu d'une phrase.
 */
function matchInitialCase(matched: string, replacement: string): string {
  const first = matched[0]
  if (!first || !replacement) return replacement
  const isUpper = first !== first.toLowerCase() && first === first.toUpperCase()
  const replacementStartsLower = replacement[0] === replacement[0].toLowerCase()
  return isUpper && replacementStartsLower ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
}

/**
 * Remplace toutes les occurrences de `find` (insensible à la casse **et aux accents**,
 * comme la recherche) par `replacement`. Le texte d'origine est préservé partout ailleurs.
 */
export function replaceInText(text: string, find: string, replacement: string): { text: string; count: number } {
  // Les espaces font partie de la recherche (« de la » ou «  organisations ») : on ne les retire pas,
  // sinon un remplacement par une chaîne vide laisserait une double espace invisible.
  const needle = fold(find)
  if (!needle.trim() || !text) return { text, count: 0 }
  const { folded, map } = foldWithMap(text)
  let out = ''
  let cursor = 0
  let from = 0
  let count = 0
  for (;;) {
    const at = folded.indexOf(needle, from)
    if (at < 0) break
    const start = map[at] ?? 0
    const end = (map[at + needle.length - 1] ?? start) + 1
    out += text.slice(cursor, start) + matchInitialCase(text.slice(start, end), replacement)
    cursor = end
    from = at + needle.length
    count++
  }
  if (!count) return { text, count: 0 }
  return { text: out + text.slice(cursor), count }
}

/** Ce qui change dans une carte d'une liste. */
export type CardChange = {
  /** position de la carte dans la liste */
  index: number
  /** « Question 3 — Quels sont les tarifs ? » */
  name: string
  /** libellé du sous-champ modifié (« Réponse », « Description »…) */
  fieldLabel: string
  before: string
  after: string
  /** nombre d'occurrences dans ce texte */
  count: number
}

export type ReplacementPlanItem = {
  field: ContentField
  /** valeur affichée actuellement (brouillon s'il existe, sinon en ligne) */
  before: string
  /** valeur à enregistrer en brouillon */
  after: string
  /** nombre d'occurrences dans ce champ */
  count: number
  /**
   * Cartes d'une liste : une entrée par texte de carte modifié. La liste entière est réécrite
   * en une seule fois (c'est ainsi qu'elle est stockée), mais seuls ces textes changent.
   */
  cards?: CardChange[]
}

export type ReplacementStats = {
  /** nombre de textes touchés (un texte de champ, ou un texte de carte) */
  fields: number
  pages: number
  occurrences: number
}

/**
 * Remplacement global dans une liste : on relit ses cartes, on remplace dans chaque texte,
 * puis on réécrit la liste entière. Les liens et les choix fermés (mise en avant, icône)
 * ne sont jamais touchés.
 */
function planListReplacement(field: ContentField, find: string, replacement: string): ReplacementPlanItem | null {
  const def = LIST_DEFS[field.key]
  const items = field.listItems
  if (!def || !items?.length) return null
  const cards: CardChange[] = []
  let count = 0
  const next: ListItem[] = items.map((item, i) => {
    const updated = { ...item }
    for (const f of def.fields) {
      if (!isReplaceableListField(f)) continue
      const before = item[f.key] ?? ''
      const result = replaceInText(before, find, replacement)
      // Un remplacement qui redonne le même texte (même mot) n'est pas un changement.
      if (!result.count || result.text === before) continue
      updated[f.key] = result.text
      count += result.count
      cards.push({
        index: i,
        name: listItemName(def, item, i),
        fieldLabel: f.label,
        before,
        after: result.text,
        count: result.count,
      })
    }
    return updated
  })
  if (!cards.length) return null
  return { field, before: field.effectiveValue, after: serializeList(next), count, cards }
}

/**
 * Champs qui seraient modifiés par un remplacement, avec leur nouvelle valeur.
 * Travaille sur `effectiveValue` : un brouillon existant est complété, pas écrasé par l'ancien publié.
 * Les cartes des listes sont vues comme leurs textes : ce sont eux qu'on cherche, pas le JSON.
 */
export function planReplacements(
  index: ContentField[],
  find: string,
  replacement: string,
): ReplacementPlanItem[] {
  if (!fold(find).trim()) return []
  const plan: ReplacementPlanItem[] = []
  for (const field of index) {
    if (isListField(field)) {
      const item = planListReplacement(field, find, replacement)
      if (item) plan.push(item)
      continue
    }
    if (!isReplaceableField(field.type)) continue
    const { text, count } = replaceInText(field.effectiveValue, find, replacement)
    if (!count || text === field.effectiveValue) continue
    plan.push({ field, before: field.effectiveValue, after: text, count })
  }
  return plan
}

export function replacementStats(plan: ReplacementPlanItem[]): ReplacementStats {
  const pages = new Set<string>()
  let occurrences = 0
  let texts = 0
  for (const item of plan) {
    pages.add(item.field.page)
    occurrences += item.count
    texts += item.cards ? item.cards.length : 1
  }
  return { fields: texts, pages: pages.size, occurrences }
}
