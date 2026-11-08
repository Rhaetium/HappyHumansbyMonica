/**
 * Liens de réservation (Calendly) — logique pure, sans dépendance React/Next.
 *
 * Les valeurs se règlent dans le CMS (⚙️ Paramètres → 📅 Réservation) et sont servies au site par
 * `/api/cms/public-settings`. Les constantes ci-dessous ne sont que des **valeurs de secours** :
 * aucune page ne doit écrire d'adresse Calendly en dur (vérifié par le test « aucun texte en dur »).
 */

export const CALENDLY_BASE_DEFAULT = 'https://calendly.com/happyhumans-coaching'

/**
 * Services qui peuvent avoir leur propre rendez-vous Calendly.
 *
 * La valeur est volontairement **vide** : un slug d'événement ne peut pas être deviné, et un slug
 * périmé casse le bouton (Calendly répond « This Calendly URL is not valid »). Tant que Monica n'a
 * pas saisi le nom du rendez-vous dans le CMS, le service retombe sur l'agenda du compte.
 */
export const CALENDLY_EVENTS_DEFAULT = {
  coaching: '',
  'happiness-design': '',
  'sparring-partner': '',
  entreprises: '',
  relations: '',
} as const

export type CalendlyService = keyof typeof CALENDLY_EVENTS_DEFAULT

export const CALENDLY_SERVICES = Object.keys(CALENDLY_EVENTS_DEFAULT) as CalendlyService[]

/**
 * Nom du rendez-vous à créer dans Calendly pour chaque service — **exemples**, pas des replis.
 * Ils sont affichés comme texte indicatif dans le CMS (⚙️ Paramètres → 📅 Réservation) pour montrer
 * la forme attendue ; ils ne sont jamais envoyés à Calendly (l'adresse resterait invalide).
 */
export const CALENDLY_EVENT_SUGGESTIONS: Record<CalendlyService, string> = {
  coaching: 'seance-decouverte-coaching',
  'happiness-design': 'seance-decouverte-happiness-design',
  'sparring-partner': 'seance-decouverte-sparring',
  entreprises: 'seance-decouverte-entreprises',
  relations: 'seance-decouverte-relations',
}

/** Texte indicatif du champ « Rendez-vous » dans le CMS : la forme attendue, jamais une adresse. */
export const CALENDLY_EVENT_PLACEHOLDER = 'ex : seance-decouverte-coaching'

/** Clé de réglage (table `cms_settings_kv`) qui porte le slug d'un service. */
export const CALENDLY_EVENT_SETTING: Record<CalendlyService, string> = {
  coaching: 'calendly_event_coaching',
  'happiness-design': 'calendly_event_happiness_design',
  'sparring-partner': 'calendly_event_sparring',
  entreprises: 'calendly_event_entreprises',
  relations: 'calendly_event_relations',
}

export const CALENDLY_BASE_SETTING = 'calendly_base_url'

/**
 * Adresse du compte Calendly, sans barre finale. Une valeur vide (ou absente) retombe sur le défaut,
 * une valeur sans `https://` est complétée : un réglage mal saisi ne casse jamais les boutons.
 */
export function calendlyBase(value?: string | null): string {
  const raw = (value ?? '').trim() || CALENDLY_BASE_DEFAULT
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withScheme.replace(/\/+$/, '')
}

/** Slug d'un service : le réglage s'il est rempli, sinon le défaut. Chaîne vide acceptée pour « pas de préselection ». */
export function calendlySlug(service: CalendlyService, value?: string | null): string {
  const raw = (value ?? '').trim()
  return (raw || CALENDLY_EVENTS_DEFAULT[service] || '').replace(/^\/+/, '')
}

/** Adresse d'un rendez-vous : `<compte>/<slug>`, ou simplement `<compte>` si le service n'a pas de slug. */
export function calendlyEventUrl(service: CalendlyService, base?: string | null, slug?: string | null): string {
  const root = calendlyBase(base)
  const path = calendlySlug(service, slug)
  return path ? `${root}/${path}` : root
}

/** Adresse du compte seul (lien « ouvrir Calendly directement »). */
export function calendlyProfileUrl(base?: string | null): string {
  return calendlyBase(base)
}

/** Réglages d'affichage du widget intégré (masque l'entête Calendly et applique la couleur de la charte). */
export const CALENDLY_WIDGET_QUERY = 'hide_landing_page_details=1&hide_gdpr_banner=1&primary_color=2d5f54'

export function calendlyWidgetUrl(url: string): string {
  return url.includes('?') ? `${url}&${CALENDLY_WIDGET_QUERY}` : `${url}?${CALENDLY_WIDGET_QUERY}`
}

/** Paramètre `?from=` d'une page → service Calendly (inconnu = compte seul). */
export function calendlyServiceFrom(from: string | null | undefined): CalendlyService | null {
  const key = (from ?? '').trim()
  return (CALENDLY_SERVICES as string[]).includes(key) ? (key as CalendlyService) : null
}
