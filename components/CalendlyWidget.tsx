'use client'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useCalendly } from '@/hooks/useCalendly'
import { useCalendlyAvailability } from '@/hooks/useCalendlyAvailability'
import { shouldHideCalendlyCta } from '@/lib/calendly-availability'
import { CalendlyBlocked } from '@/components/CalendlyGate'
import { calendlyServiceFrom, calendlyWidgetUrl, type CalendlyService } from '@/lib/calendly-config'

/**
 * Agenda Calendly intégré. L'adresse du compte et les rendez-vous par service viennent du CMS
 * (⚙️ Paramètres → 📅 Réservation) ; les libellés affichés au-dessus viennent de la page « Réservation ».
 *
 * Si le compte n'a aucun rendez-vous public, Calendly affiche « No openings at the moment » dans une
 * iframe muette : on montre alors un message clair et un lien email à la place (textes du CMS).
 */
export default function CalendlyWidget({
  labels,
  loadingLabel = '',
  blockedTitle = '',
  blockedText = '',
  contactEmail,
}: {
  labels?: Partial<Record<CalendlyService, string>>
  /** Texte affiché le temps que les réglages arrivent (fourni par la page, donc modifiable dans le CMS). */
  loadingLabel?: string
  /** Titre du message quand le compte n'a aucune disponibilité publique. */
  blockedTitle?: string
  /** Corps du message quand le compte n'a aucune disponibilité publique. */
  blockedText?: string
  /** Email de contact (réglage du CMS) : repli proposé au visiteur quand la réservation est bloquée. */
  contactEmail?: string
}) {
  const params = useSearchParams()
  const service = calendlyServiceFrom(params.get('from'))
  const { ready, eventUrl, profileUrl } = useCalendly()

  // On attend les réglages du CMS : sinon l'agenda se lancerait sur le compte par défaut.
  if (!ready) {
    return (
      <div className="flex h-[700px] items-center justify-center text-sm text-stone-400">
        {loadingLabel}
      </div>
    )
  }

  return (
    <CalendlyEmbed
      service={service}
      url={service ? eventUrl(service) : profileUrl}
      label={service ? (labels?.[service] ?? '') : ''}
      blockedTitle={blockedTitle}
      blockedText={blockedText}
      contactEmail={contactEmail}
    />
  )
}

/**
 * L'agenda une fois les réglages connus. Isolé dans un composant à part pour que le hook de
 * disponibilité s'exécute toujours dans le même ordre (les règles des hooks interdisent un retour
 * anticipé avant un hook).
 */
function CalendlyEmbed({
  service,
  url,
  label,
  blockedTitle,
  blockedText,
  contactEmail,
}: {
  service: CalendlyService | null
  url: string
  label: string
  blockedTitle: string
  blockedText: string
  contactEmail?: string
}) {
  const availability = useCalendlyAvailability(url)

  // `unavailable` = certitude (API Calendly). `unknown` = on n'a pas pu vérifier → on garde l'agenda.
  if (shouldHideCalendlyCta(availability)) {
    return (
      <CalendlyBlocked
        title={blockedTitle}
        text={blockedText}
        contactEmail={contactEmail}
        className="rounded-2xl bg-[#fdf6ec] px-6 py-10 text-center"
        style={{ minWidth: 320, minHeight: 700 }}
      />
    )
  }

  return (
    <>
      {label && (
        <div className="flex justify-center mb-4">
          <span className="bg-[#eef5f3] text-[#2d5f54] text-xs font-semibold rounded-full px-3 py-1">
            {label}
          </span>
        </div>
      )}
      <div
        className="calendly-inline-widget rounded-2xl overflow-hidden"
        data-url={calendlyWidgetUrl(url)}
        style={{ minWidth: 320, height: 700 }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
    </>
  )
}
