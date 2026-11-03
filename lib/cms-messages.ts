/**
 * Classement des messages de l'onglet « 💬 Messages » — logique pure, sans React.
 *
 * Pourquoi : la table `contact_messages` sert à deux choses très différentes. Les visiteurs y
 * laissent un message (type `contact`) ; le site y dépose aussi ses **alertes techniques** quand
 * quelque chose l'empêche de fonctionner (type `booking_alert` : « Calendly n'a aucun rendez-vous
 * public, personne ne peut réserver »). Mélangés, ces deux flux se noient l'un l'autre : Monica
 * cherche une demande de client et tombe sur un message automatique, ou l'inverse.
 *
 * On les sépare à l'affichage (onglets) sans toucher à la base : un message est classé par son
 * `type`. Tout type inconnu est traité comme un message de visiteur — on ne masque jamais un
 * message reçu par erreur.
 */

export type MessageKind = 'visitor' | 'alert'

/** Types déposés par le site lui-même (jamais par un visiteur). */
const ALERT_TYPES = new Set(['booking_alert'])

/** Classe un message : alerte technique du site, ou message d'un visiteur. */
export function messageKind(type: string | null | undefined): MessageKind {
  return ALERT_TYPES.has((type ?? '').trim()) ? 'alert' : 'visitor'
}

export type MessageFilter = 'all' | 'unread' | 'visitor' | 'alert'

/**
 * Filtre un message selon l'onglet choisi.
 * `all` garde tout ; `unread` ne garde que ce qui n'a pas encore été lu.
 */
export function matchesMessageFilter(
  message: { type?: string | null; status?: string | null },
  filter: MessageFilter,
): boolean {
  if (filter === 'unread') return message.status !== 'read'
  if (filter === 'visitor') return messageKind(message.type) === 'visitor'
  if (filter === 'alert') return messageKind(message.type) === 'alert'
  return true
}

/**
 * Compte les messages à mettre en avant dans la pastille de l'onglet : les messages **non lus
 * d'un visiteur**. Les alertes techniques ne sont pas comptées ici — elles ont leur propre
 * signalement sur le tableau de bord, plus visible qu'un chiffre parmi d'autres.
 */
export function unreadVisitorCount(messages: { type?: string | null; status?: string | null }[]): number {
  return messages.filter(m => m.status !== 'read' && messageKind(m.type) === 'visitor').length
}

/** Nombre d'alertes techniques non lues (affiché séparément sur le tableau de bord). */
export function unreadAlertCount(messages: { type?: string | null; status?: string | null }[]): number {
  return messages.filter(m => m.status !== 'read' && messageKind(m.type) === 'alert').length
}
