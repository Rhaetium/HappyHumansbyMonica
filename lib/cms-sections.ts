/**
 * Sections de page réordonnables / masquables depuis le CMS (admin → page → « Structure »).
 *
 * Chaque page déclare ses sections dans PAGE_SECTIONS (id stable + libellé lisible). La disposition choisie
 * est stockée dans UN champ du CMS, `sections_layout`, au format JSON : {"order":["a","b"],"hidden":["c"]}.
 * Valeur vide = ordre d'origine : une page jamais modifiée s'affiche exactement comme avant.
 *
 * Règles de sécurité :
 *  - `pin: 'start'` (bandeau d'ouverture) / `pin: 'end'` (appel à l'action final) : sections verrouillées,
 *    ni déplaçables ni masquables → la page garde toujours un début et une fin cohérents ;
 *  - un id inconnu (section supprimée du code) est ignoré ; une section ajoutée au code apparaît à la fin ;
 *  - un JSON invalide retombe sur l'ordre d'origine : une mauvaise valeur ne casse jamais la page.
 *
 * Fichier SANS dépendance (partagé par les pages, l'admin et les tests).
 * Dupliquer une section n'est pas prévu : chaque section lit ses propres champs.
 */

export const SECTIONS_KEY = 'sections_layout'

export type SectionDef = { id: string; label: string; pin?: 'start' | 'end' }
export type SectionsLayout = { order: string[]; hidden: string[] }

export const PAGE_SECTIONS: Record<string, SectionDef[]> = {
  home: [
    { id: 'hero', label: 'Bandeau d’accueil', pin: 'start' },
    { id: 'services', label: 'Accompagnement : particuliers et entreprises' },
    { id: 'explorer', label: 'Explorez les thématiques' },
    { id: 'faq', label: 'Questions fréquentes' },
    { id: 'booking', label: 'Réservation d’une séance' },
    { id: 'contact', label: 'Contact' },
  ],
  'a-propos': [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'parcours', label: 'Le parcours' },
    { id: 'accompagnements', label: 'Mes coachings et mentorings' },
    { id: 'happiness_design', label: 'Happiness Design' },
    { id: 'cta', label: 'Appel à l’action final', pin: 'end' },
  ],
  coaching: [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'individuel', label: 'Coaching individuel' },
    { id: 'temoignages', label: 'Témoignages' },
    { id: 'tunnel', label: 'Réservation rapide' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'organisations', label: 'Coaching pour les entreprises' },
    { id: 'cta', label: 'Appel à l’action final', pin: 'end' },
  ],
  entreprises: [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'offres', label: 'Ce que je propose' },
    { id: 'domaines', label: 'Domaines d’intervention' },
    { id: 'programme', label: 'Coaching Flash — prise de poste' },
    { id: 'contact', label: 'Bandeau « Un projet ? »' },
    { id: 'tarifs', label: 'Tarifs' },
    { id: 'pourquoi', label: 'Pourquoi une coach issue du marketing' },
    { id: 'temoignage', label: 'Témoignage' },
  ],
  'sparring-partner': [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'situations', label: 'Les situations concernées' },
    { id: 'pourquoi', label: 'Pourquoi un sparring partner' },
    { id: 'cta', label: 'Appel à l’action final', pin: 'end' },
  ],
  relations: [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'styles', label: 'Les 4 styles d’attachement' },
    { id: 'test', label: 'Test d’attachement' },
    { id: 'danse', label: 'La danse anxieux-évitant' },
    { id: 'changement', label: 'Le changement est possible' },
    { id: 'communication', label: 'Communication efficace' },
    { id: 'travail', label: 'Au travail aussi' },
    { id: 'actions', label: 'Vos 3 actions' },
    { id: 'monde_pro', label: 'Attachement et monde professionnel' },
    { id: 'reservation', label: 'Réservation' },
    { id: 'ressources', label: 'Ressources théoriques' },
  ],
  'happiness-design': [
    { id: 'hero', label: 'Bandeau d’ouverture', pin: 'start' },
    { id: 'pourqui', label: 'Pour qui ?' },
    { id: 'program', label: 'Le programme en 12 séances' },
    { id: 'tools', label: 'Les outils' },
    { id: 'pricing', label: 'Tarifs' },
    { id: 'cta', label: 'Appel à l’action final', pin: 'end' },
  ],
}

const uniq = (a: string[]) => [...new Set(a)]
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')

/** Lit le JSON du CMS ; toute valeur invalide donne une disposition vide (= ordre d'origine). */
export function parseLayout(json?: string | null): SectionsLayout {
  if (!json || !json.trim()) return { order: [], hidden: [] }
  try {
    const v = JSON.parse(json)
    return { order: isStrArray(v?.order) ? v.order : [], hidden: isStrArray(v?.hidden) ? v.hidden : [] }
  } catch {
    return { order: [], hidden: [] }
  }
}

/** Ordre COMPLET et valide (toutes les sections connues, verrous respectés) — utilisé par l'éditeur. */
export function fullOrder(defs: SectionDef[], layout: SectionsLayout): string[] {
  const known = new Set(defs.map(d => d.id))
  const start = defs.filter(d => d.pin === 'start').map(d => d.id)
  const end = defs.filter(d => d.pin === 'end').map(d => d.id)
  const pinned = new Set([...start, ...end])
  const middle = uniq(layout.order.filter(id => known.has(id) && !pinned.has(id)))
  for (const d of defs) if (!pinned.has(d.id) && !middle.includes(d.id)) middle.push(d.id)
  return [...start, ...middle, ...end]
}

/** Ids à afficher, dans l'ordre : c'est ce que la page rend. */
export function resolveSections(defs: SectionDef[], json?: string | null): string[] {
  const layout = parseLayout(json)
  const pinned = new Set(defs.filter(d => d.pin).map(d => d.id))
  const hidden = new Set(layout.hidden.filter(id => !pinned.has(id)))
  return fullOrder(defs, layout).filter(id => !hidden.has(id))
}

/** Valeur à enregistrer : vide si la disposition est celle d'origine (la page retombe alors sur les valeurs par défaut). */
export function serializeLayout(defs: SectionDef[], layout: SectionsLayout): string {
  const pinned = new Set(defs.filter(d => d.pin).map(d => d.id))
  const order = fullOrder(defs, layout)
  const hidden = uniq(layout.hidden.filter(id => defs.some(d => d.id === id) && !pinned.has(id)))
  const defaultOrder = fullOrder(defs, { order: [], hidden: [] })
  const sameOrder = order.length === defaultOrder.length && order.every((id, i) => id === defaultOrder[i])
  if (sameOrder && hidden.length === 0) return ''
  return JSON.stringify({ order, hidden })
}

/** Déplace une section d'un cran ; les sections verrouillées ne bougent pas et ne peuvent pas être dépassées. */
export function moveSection(defs: SectionDef[], layout: SectionsLayout, id: string, dir: -1 | 1): SectionsLayout {
  const order = fullOrder(defs, layout)
  const pinned = new Set(defs.filter(d => d.pin).map(d => d.id))
  if (pinned.has(id)) return { order, hidden: layout.hidden }
  const i = order.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= order.length || pinned.has(order[j])) return { order, hidden: layout.hidden }
  const next = [...order]
  ;[next[i], next[j]] = [next[j], next[i]]
  return { order: next, hidden: layout.hidden }
}

export function toggleSection(defs: SectionDef[], layout: SectionsLayout, id: string): SectionsLayout {
  if (defs.find(d => d.id === id)?.pin) return layout
  const hidden = layout.hidden.includes(id) ? layout.hidden.filter(h => h !== id) : [...layout.hidden, id]
  return { order: fullOrder(defs, layout), hidden }
}
