'use client'

import { useEffect } from 'react'
import { COOKIE_CONSENT_EVENT, hasOptionalTrackingConsent } from '@/lib/consent'

/**
 * Google Tag Manager + Google Analytics 4 — chargés UNIQUEMENT après l'acceptation des cookies (RGPD).
 * Tant que le visiteur n'a pas accepté (ou s'il refuse), aucun script Google n'est téléchargé.
 *
 * Conteneur GTM : NEXT_PUBLIC_GTM_ID. Mesure GA4 : NEXT_PUBLIC_GA_ID (vide = GA4 désactivé).
 * ⚠ GA4 est envoyé directement par le site : ne PAS ajouter aussi une balise GA4 dans Tag Manager
 * (chaque visite serait comptée deux fois).
 * Expose aussi `window.gtag`, utilisé par lib/analytics.ts (trackEvent).
 */
const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-5LQ9GB72').trim()
const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? 'G-ZWVFTSVVH3').trim()

type W = { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export default function GoogleTagManager() {
  useEffect(() => {
    if (!GTM_ID && !GA_ID) return

    const load = () => {
      if (!hasOptionalTrackingConsent()) return
      if (document.getElementById('gtm-script') || document.getElementById('ga-script')) return

      const w = window as unknown as W
      w.dataLayer = w.dataLayer || []
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments)
      }

      if (GTM_ID) {
        w.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
        addScript('gtm-script', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`)
      }
      if (GA_ID) {
        w.gtag('js', new Date())
        w.gtag('config', GA_ID)
        addScript('ga-script', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`)
      }
    }

    load() // visiteur ayant déjà accepté lors d'une visite précédente
    window.addEventListener(COOKIE_CONSENT_EVENT, load) // acceptation à l'instant
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, load)
  }, [])

  return null
}
