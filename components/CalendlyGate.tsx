'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useCalendlyAvailability } from '@/hooks/useCalendlyAvailability'
import { shouldHideCalendlyCta } from '@/lib/calendly-availability'

/**
 * Message affiché quand la réservation est impossible (compte Calendly sans rendez-vous public) :
 * un titre, un texte et un lien email — tous fournis par le CMS, aucune phrase en dur ici.
 */
export function CalendlyBlocked({
  title = '',
  text = '',
  contactEmail,
  className = 'rounded-2xl bg-[#fdf6ec] px-6 py-10 text-center',
  style,
  compact = false,
}: {
  title?: string
  text?: string
  contactEmail?: string
  className?: string
  style?: CSSProperties
  /** Variante courte, pour remplacer un petit bouton au milieu d'une carte. */
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className={className} style={style}>
        {title && <p className="text-sm font-semibold text-stone-700">{title}</p>}
        {contactEmail && (
          <a href={`mailto:${contactEmail}`} className="mt-1 inline-block text-sm text-[#2d5f54] underline">
            {contactEmail}
          </a>
        )}
      </div>
    )
  }
  return (
    <div className={className} style={style}>
      {title && <p className="font-serif text-xl text-stone-900">{title}</p>}
      {text && (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600">{text}</p>
      )}
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2d5f54] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {contactEmail}
        </a>
      )}
    </div>
  )
}

/**
 * Affiche son contenu (un bouton « Réserver », une carte Calendly…) **seulement si** le compte
 * Calendly visé a des rendez-vous publics. Sinon, montre un message clair et un lien email à la place.
 *
 * Même règle que l'agenda intégré : seul un `unavailable` avéré masque le bouton ; si la vérification
 * échoue (`unknown`), le bouton reste affiché — on ne remplace jamais un bouton par erreur.
 */
export default function CalendlyGate({
  url,
  contactEmail,
  blockedTitle = '',
  blockedText = '',
  className,
  style,
  compact = false,
  children,
}: {
  url: string
  contactEmail?: string
  blockedTitle?: string
  blockedText?: string
  /** Classes du bloc affiché quand la réservation est impossible. */
  className?: string
  style?: CSSProperties
  /** Variante courte, pour remplacer un petit bouton au milieu d'une carte. */
  compact?: boolean
  children: ReactNode
}) {
  const availability = useCalendlyAvailability(url)
  if (!shouldHideCalendlyCta(availability)) return <>{children}</>

  return (
    <CalendlyBlocked
      title={blockedTitle}
      text={blockedText}
      contactEmail={contactEmail}
      className={className}
      style={style}
      compact={compact}
    />
  )
}
