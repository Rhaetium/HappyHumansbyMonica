'use client'

import { useEffect } from 'react'
import { COOKIE_CONSENT_EVENT, hasOptionalTrackingConsent } from '@/lib/consent'

/**
 * Google Tag Manager — chargé UNIQUEMENT après l'acceptation des cookies (RGPD).
 * Tant que le visiteur n'a pas accepté (ou s'il refuse), aucun script Google n'est téléchargé.
 *
 * Conteneur : NEXT_PUBLIC_GTM_ID (valeur par défaut ci-dessous).
 * Expose aussi `window.gtag`, utilisé par lib/analytics.ts (trackEvent) : il alimente le dataLayer de GTM.
 */
const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5LQ9GB72').trim()

export default function GoogleTagManager() {
  useEffect(() => {
    if (!GTM_ID) return

    const load = () => {
      if (!hasOptionalTrackingConsent()) return
      if (document.getElementById('gtm-script')) return

      const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
      w.dataLayer = w.dataLayer || []
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments)
      }
      w.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

      const script = document.createElement('script')
      script.id = 'gtm-script'
      script.async = true
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
      document.head.appendChild(script)
    }

    load() // visiteur ayant déjà accepté lors d'une visite précédente
    window.addEventListener(COOKIE_CONSENT_EVENT, load) // acceptation à l'instant
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, load)
  }, [])

  return null
}
