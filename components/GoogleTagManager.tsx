'use client'

import { useEffect } from 'react'
import { COOKIE_CONSENT_EVENT, hasOptionalTrackingConsent } from '@/lib/consent'

/**
 * Google Tag Manager + Google Analytics 4 — chargés UNIQUEMENT après l'acceptation des cookies (RGPD).
 * Tant que le visiteur n'a pas accepté (ou s'il refuse), aucun script Google n'est téléchargé.
 *
 * Les identifiants sont choisis par le serveur (app/layout.tsx → lib/analytics-ids.ts) : réglage de l'admin
 * (Paramètres → Tag Manager & Analytics), sinon NEXT_PUBLIC_GTM_ID / NEXT_PUBLIC_GA_ID (vide = désactivé), sinon ceux d'origine.
 * ⚠ GA4 est envoyé directement par le site : ne PAS ajouter aussi une balise GA4 dans Tag Manager
 * (chaque visite serait comptée deux fois).
 * Expose aussi `window.gtag`, utilisé par lib/analytics.ts (trackEvent).
 */
type W = { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export default function GoogleTagManager({ gtmId, gaId }: { gtmId: string; gaId: string }) {
  useEffect(() => {
    if (!gtmId && !gaId) return

    const load = () => {
      if (!hasOptionalTrackingConsent()) return
      if (document.getElementById('gtm-script') || document.getElementById('ga-script')) return

      const w = window as unknown as W
      w.dataLayer = w.dataLayer || []
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments)
      }

      if (gtmId) {
        w.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
        addScript('gtm-script', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`)
      }
      if (gaId) {
        w.gtag('js', new Date())
        w.gtag('config', gaId)
        addScript('ga-script', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`)
      }
    }

    load() // visiteur ayant déjà accepté lors d'une visite précédente
    window.addEventListener(COOKIE_CONSENT_EVENT, load) // acceptation à l'instant
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, load)
  }, [gtmId, gaId])

  return null
}
