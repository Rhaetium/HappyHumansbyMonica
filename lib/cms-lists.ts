/**
 * Listes répétables du CMS (FAQ, programmes, témoignages, domaines, formules, cas sparring).
 *
 * Une liste est stockée dans UN champ du CMS, en JSON :
 *   [{ "q": "…", "a": "…" }, { … }]
 * Une valeur vide = « rien de personnalisé » : la liste est alors reconstruite à partir des anciens
 * champs numérotés (faq_1_q, program_2_label…), qui contiennent peut-être déjà des textes saisis
 * dans l'ancien admin. On ne perd donc aucun contenu existant, et aucune migration SQL n'est nécessaire.
 *
 * Règles de sécurité :
 *  - JSON invalide (ou pas un tableau) → on retombe sur les anciens champs, jamais sur une page cassée ;
 *  - `[]` est une valeur légitime : la liste a été vidée volontairement, elle reste vide ;
 *  - seuls les champs déclarés dans LIST_DEFS sont lus (une clé inconnue est ignorée) ;
 *  - un élément dont tous les champs sont vides est masqué (c'est ainsi qu'on « supprime » un
 *    ancien emplacement numéroté : il suffit de vider ses champs).
 *
 * Fichier SANS dépendance (ni React ni Next) : partagé par les pages, l'admin et les tests.
 */

import { FAQ_SLOTS } from './cms-defaults/faq'

export type ListItem = Record<string, string>

export type ListFieldDef = {
  key: string
  label: string
  /** text = une ligne ; textarea = plusieurs lignes ; select = choix fermé */
  type?: 'text' | 'textarea' | 'select'
  options?: string[]
  optionLabels?: string[]
  /** textarea : chaque ligne est un élément distinct (puces, avantages…) */
  lines?: boolean
  hint?: string
  /**
   * Champ qui n'est pas du texte à lire : un lien (« calendly », « /booking »), une ancre.
   * Il est exclu de la recherche par contenu et du remplacement global.
   */
  noReplace?: boolean
}

export type ListDef = {
  /** Titre affiché au-dessus de l'éditeur */
  label: string
  /** Nom d'un élément, au singulier (« programme », « question ») */
  itemLabel: string
  /** Libellé du bouton d'ajout (« Ajouter un programme ») */
  addLabel: string
  /** Champ qui nomme la carte (« q » pour une question, « label » pour un programme) */
  titleKey?: string
  fields: ListFieldDef[]
  /**
   * Anciens champs numérotés, lus tant qu'aucune liste JSON n'a été enregistrée.
   * `extras` complète les valeurs qui ne venaient pas du texte (lien du bouton, mise en avant, icône)
   * et qui étaient déduites de la position de l'élément.
   */
  legacy?: {
    prefix: string
    count: number
    /** Ancien nom du champ selon la position (ex. program_3_format pour « durée ») */
    aliases?: Record<string, string[]>
    extras?: (index: number) => ListItem
  }
}

/** Ordre des icônes des « domaines d'intervention » de l'ancienne page Entreprises. */
export const DOMAIN_ICONS = ['people', 'globe', 'chat', 'growth', 'users', 'smile'] as const

export const LIST_DEFS: Record<string, ListDef> = {
  faq_questions: {
    label: 'Questions & réponses',
    itemLabel: 'question',
    addLabel: 'Ajouter une question',
    titleKey: 'q',
    fields: [
      { key: 'q', label: 'Question', type: 'textarea' },
      { key: 'a', label: 'Réponse', type: 'textarea' },
    ],
    legacy: { prefix: 'faq', count: FAQ_SLOTS },
  },

  coaching_programs: {
    label: 'Programmes & tarifs',
    itemLabel: 'programme',
    addLabel: 'Ajouter un programme',
    titleKey: 'label',
    fields: [
      { key: 'label', label: 'Nom du programme', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre (facultatif)', type: 'text' },
      { key: 'price', label: 'Prix', type: 'text' },
      { key: 'unit', label: 'Durée / format', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
      { key: 'cta', label: 'Bouton', type: 'text' },
      {
        key: 'href',
        label: 'Lien du bouton',
        type: 'text',
        noReplace: true,
        hint: 'calendly = agenda de réservation (Paramètres → Réservation). Sinon /booking, /contact, /happiness-design ou une adresse complète.',
      },
      {
        key: 'highlight',
        label: 'Mise en avant',
        type: 'select',
        options: ['non', 'oui'],
        optionLabels: ['Non', 'Oui (carte verte)'],
      },
    ],
    legacy: {
      prefix: 'program',
      count: 4,
      aliases: { unit: ['format'] },
      extras: i => ({
        href: ['calendly', '/booking', '/booking', '/happiness-design'][i] ?? '/booking',
        highlight: i === 2 ? 'oui' : 'non',
      }),
    },
  },

  coaching_testimonials: {
    label: 'Témoignages',
    itemLabel: 'témoignage',
    addLabel: 'Ajouter un témoignage',
    titleKey: 'name',
    fields: [
      { key: 'quote', label: 'Témoignage', type: 'textarea' },
      { key: 'name', label: 'Auteur', type: 'text' },
      { key: 'role', label: 'Fonction', type: 'text' },
    ],
    legacy: { prefix: 'testimonial', count: 4 },
  },

  entreprises_domains: {
    label: 'Domaines d’intervention',
    itemLabel: 'domaine',
    addLabel: 'Ajouter un domaine',
    titleKey: 'title',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
      {
        key: 'icon',
        label: 'Icône',
        type: 'select',
        options: [...DOMAIN_ICONS],
        optionLabels: ['Personnes', 'Globe', 'Échange', 'Croissance', 'Groupe', 'Sourire'],
      },
    ],
    legacy: {
      prefix: 'domain',
      count: 6,
      extras: i => ({ icon: DOMAIN_ICONS[i] ?? 'people' }),
    },
  },

  entreprises_pricing: {
    label: 'Formules & tarifs',
    itemLabel: 'formule',
    addLabel: 'Ajouter une formule',
    titleKey: 'title',
    fields: [
      { key: 'title', label: 'Nom de la formule', type: 'text' },
      { key: 'price', label: 'Prix', type: 'text' },
      { key: 'unit', label: 'Précision de prix (facultatif)', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
      { key: 'items', label: 'Ce qui est inclus', type: 'textarea', lines: true, hint: 'Un élément par ligne.' },
      { key: 'cta', label: 'Bouton', type: 'text' },
      { key: 'href', label: 'Lien du bouton', type: 'text', noReplace: true, hint: 'Une page du site (/contact, /booking, /coaching…) ou une adresse complète commençant par https://. Vide : /contact.' },
      {
        key: 'highlight',
        label: 'Mise en avant',
        type: 'select',
        options: ['non', 'oui'],
        optionLabels: ['Non', 'Oui (carte verte)'],
      },
    ],
    legacy: {
      prefix: 'pricing_card',
      count: 3,
      extras: i => ({ highlight: i === 1 ? 'oui' : 'non' }),
    },
  },

  sparring_use_cases: {
    label: 'Situations qui appellent un sparring partner',
    itemLabel: 'situation',
    addLabel: 'Ajouter une situation',
    titleKey: 'title',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
    ],
    legacy: { prefix: 'use_case', count: 5 },
  },
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Lit le JSON d'une liste. Retourne `null` si la valeur est absente ou invalide (l'appelant retombe
 * alors sur les anciens champs) ; retourne `[]` si la liste a été volontairement vidée.
 */
export function parseItems(json?: string | null): ListItem[] | null {
  if (!json || !json.trim()) return null
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  if (!Array.isArray(value)) return null
  return value.filter(isRecord).map(obj => {
    const item: ListItem = {}
    for (const [k, v] of Object.entries(obj)) if (typeof v === 'string') item[k] = v
    return item
  })
}

/** Ne garde que les champs connus : une clé retirée du code ne ressurgit pas dans la page. */
export function clampItems(items: ListItem[], def: ListDef): ListItem[] {
  return items.map(item => {
    const clean: ListItem = {}
    for (const f of def.fields) clean[f.key] = item[f.key] ?? ''
    return clean
  })
}

const hasText = (def: ListDef, item: ListItem) => def.fields.some(f => (item[f.key] ?? '').trim() !== '')

/**
 * Reconstruit une liste à partir des anciens champs numérotés présents dans `content`
 * (complété par `fallback`, ex. les questions d'origine de la FAQ).
 */
export function legacyItems(content: Record<string, string>, def: ListDef): ListItem[] {
  if (!def.legacy) return []
  const { prefix, count, aliases = {}, extras } = def.legacy
  const items: ListItem[] = []
  for (let i = 1; i <= count; i++) {
    const item: ListItem = {}
    for (const f of def.fields) {
      const names = [f.key, ...(aliases[f.key] ?? [])]
      let value = ''
      for (const name of names) {
        const raw = content[`${prefix}_${i}_${name}`]
        if (typeof raw === 'string' && raw.trim() !== '') {
          value = raw
          break
        }
      }
      item[f.key] = value
    }
    // Un emplacement n'existe que s'il porte du texte : les valeurs déduites de la position
    // (lien, mise en avant, icône) ne doivent pas ressusciter une carte vidée.
    if (!hasText(def, item)) continue
    if (extras) Object.assign(item, extras(i - 1))
    items.push(item)
  }
  return items
}

/**
 * Liste effective d'une page : le JSON enregistré s'il existe, sinon les anciens champs numérotés.
 * Les éléments dont tous les champs sont vides sont ignorés.
 */
export function readList(content: Record<string, string>, key: string, fallback: Record<string, string> = {}): ListItem[] {
  const def = LIST_DEFS[key]
  if (!def) return []
  const parsed = parseItems(content[key])
  if (parsed) return clampItems(parsed, def).filter(item => hasText(def, item))
  // `content` contient déjà les valeurs par défaut de la page ; `fallback` sert aux listes dont les
  // anciens emplacements ne figurent pas dans ces défauts (les questions de la FAQ).
  return legacyItems({ ...fallback, ...content }, def)
}

/** Valeur à enregistrer dans le CMS. `[]` reste `[]` : une liste vidée ne doit pas ressurgir. */
export function serializeList(items: ListItem[]): string {
  return JSON.stringify(items)
}

/**
 * Nom court d'une carte, pour les listes de résultats de l'admin : « Question 3 — Quels sont les tarifs ? ».
 * Le texte est aplati (un retour à la ligne casserait la mise en page) et coupé s'il est trop long.
 */
export function listItemName(def: ListDef, item: ListItem, index: number): string {
  const base = `${def.itemLabel.charAt(0).toUpperCase()}${def.itemLabel.slice(1)} ${index + 1}`
  const raw = def.titleKey ? (item[def.titleKey] ?? '') : ''
  const title = raw.replace(/\s+/g, ' ').trim()
  if (!title) return base
  return `${base} — ${title.length > 60 ? `${title.slice(0, 60).trimEnd()}…` : title}`
}

/** Élément vide pour le bouton « Ajouter ». */
export function blankItem(def: ListDef): ListItem {
  const item: ListItem = {}
  for (const f of def.fields) item[f.key] = f.type === 'select' ? (f.options?.[0] ?? '') : ''
  return item
}

/** Déplace un élément d'un cran. Retourne la même liste si le déplacement est impossible. */
export function moveListItem(items: ListItem[], index: number, dir: -1 | 1): ListItem[] {
  const target = index + dir
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Remplace un champ d'un élément (sans muter la liste d'origine). */
export function setListItemField(items: ListItem[], index: number, field: string, value: string): ListItem[] {
  if (index < 0 || index >= items.length) return items
  return items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
}

/** Copie d'un élément (pratique pour ajouter une variante sans tout retaper). */
export function duplicateListItem(items: ListItem[], index: number): ListItem[] {
  if (index < 0 || index >= items.length) return items
  const copy = { ...items[index] }
  return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)]
}

/** Supprime un élément. */
export function removeListItem(items: ListItem[], index: number): ListItem[] {
  if (index < 0 || index >= items.length) return items
  return items.filter((_, i) => i !== index)
}
