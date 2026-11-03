/**
 * Disponibilité d'un compte Calendly — logique pure, sans React/Next.
 *
 * Pourquoi : un compte Calendly peut exister sans aucun rendez-vous public. L'agenda intégré
 * affiche alors « No openings at the moment » dans une iframe muette (l'API JS de Calendly
 * n'expose pas ce cas), donc le visiteur croit à une panne. On interroge à la place l'API
 * publique des profils, côté serveur (elle ne renvoie aucun en-tête CORS, donc pas d'appel
 * navigateur possible).
 *
 * ⚠️ API non documentée : toute réponse inattendue est traitée comme « on ne sait pas »
 * (`unknown`). Dans ce cas on garde l'agenda intégré — jamais de faux « complet ».
 */

export type CalendlyAvailability = 'available' | 'unavailable' | 'unknown'

/**
 * Extrait le slug du compte depuis une adresse Calendly (`https://calendly.com/mon-compte` → `mon-compte`).
 * Un hôte qui n'est pas `calendly.com` renvoie une chaîne vide : on ne sonde jamais un autre service.
 */
export function calendlyProfileSlug(url: string | null | undefined): string {
  const raw = (url ?? '').trim()
  if (!raw) return ''
  const isCalendly = (host: string) => host === 'calendly.com' || host.endsWith('.calendly.com')
  try {
    const parsed = new URL(raw)
    return isCalendly(parsed.hostname) ? (parsed.pathname.split('/').filter(Boolean)[0] ?? '') : ''
  } catch {
    // Adresse sans schéma (`calendly.com/mon-compte`) : on tente quand même.
    const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?calendly\.com\/([^/?#]+)/i)
    return match ? match[1] : ''
  }
}

/** Adresse de l'API publique du profil. Chaîne vide si le slug est inconnu. */
export function calendlyProfileApiUrl(slug: string): string {
  return slug ? `https://calendly.com/api/booking/profiles/${encodeURIComponent(slug)}` : ''
}

/**
 * Lit la réponse de l'API profil.
 * - `unavailability_reason` non nul (ex. `profile_no_public`) → `unavailable` ;
 * - objet sans ce champ (profil public normal) → `available` ;
 * - toute autre forme → `unknown`.
 */
export function calendlyAvailabilityFromProfile(json: unknown): CalendlyAvailability {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return 'unknown'
  const profile = json as { slug?: unknown; unavailability_reason?: unknown }
  if (typeof profile.slug !== 'string') return 'unknown'
  return profile.unavailability_reason ? 'unavailable' : 'available'
}
