/**
 * « Santé du site » — ce qui empêche le site de fonctionner, en clair, sur le tableau de bord.
 *
 * Pourquoi : un problème technique (compte Calendly sans rendez-vous public, base injoignable)
 * était signalé par un message automatique enterré dans l'onglet « 💬 Messages », au milieu des
 * demandes de visiteurs. Monica devait ouvrir cet onglet pour l'apprendre. Ici, chaque problème
 * connu remonte en haut du tableau de bord, avec **ce qu'il faut faire** pour le corriger.
 *
 * Logique pure et testée (`__tests__/lib/cms-health.test.ts`) : la route ne fait que rassembler
 * les données, le verdict se décide ici.
 */

import type { CalendlyAvailability } from './calendly-availability'

export type HealthLevel = 'ok' | 'warn' | 'error'

export type HealthCheck = {
  id: string
  level: HealthLevel
  /** Titre court, en français, compris sans connaissance technique. */
  title: string
  /** Ce qui se passe, et pour qui. */
  detail: string
  /** L'action concrète à faire pour corriger (absent si tout va bien). */
  fix?: string
}

/**
 * Verdict de la réservation en ligne.
 *
 * `unavailable` est le seul cas **certain** de panne : Calendly répond que le compte n'a aucun
 * rendez-vous public, donc aucun visiteur ne peut réserver. `unknown` ne veut pas dire « cassé » :
 * la vérification a échoué (réseau, Calendly lent), donc on le dit sans alarmer.
 */
export function bookingHealthCheck(input: {
  availability: CalendlyAvailability
  profileUrl: string
  slug: string
}): HealthCheck {
  const { availability, slug } = input

  if (availability === 'unavailable') {
    return {
      id: 'booking',
      level: 'error',
      title: 'Réservation impossible',
      detail:
        `Le compte Calendly « ${slug} » n'a aucun rendez-vous public. Les visiteurs voient ` +
        `« Aucune disponibilité pour le moment » à la place de l'agenda, et personne ne peut réserver.`,
      fix:
        'Dans Calendly, créez un type de rendez-vous et publiez-le. Puis saisissez son nom dans ' +
        '⚙️ Paramètres → 📅 Réservation.',
    }
  }

  if (availability === 'available') {
    return {
      id: 'booking',
      level: 'ok',
      title: 'Réservation en ligne',
      detail: `Le compte Calendly « ${slug} » a des rendez-vous publics : les visiteurs peuvent réserver.`,
    }
  }

  return {
    id: 'booking',
    level: 'warn',
    title: 'Réservation : vérification impossible',
    detail:
      `Le site n'a pas pu interroger Calendly pour le compte « ${slug} » (réseau ou service ` +
      'momentanément indisponible). Les boutons de réservation restent affichés.',
    fix: 'Si cela dure, ouvrez votre compte Calendly pour vérifier que vos rendez-vous sont bien publiés.',
  }
}

/** Nombre de contrôles en échec, pour la pastille du tableau de bord. */
export function healthProblemCount(checks: HealthCheck[]): number {
  return checks.filter(c => c.level === 'error').length
}

/** Un contrôle « ok » ne mérite pas d'occuper le tableau de bord : on ne garde que les autres. */
export function healthNeedsAttention(checks: HealthCheck[]): HealthCheck[] {
  return checks.filter(c => c.level !== 'ok')
}
