'use client'
import { useEffect, useState } from 'react'
import type { CalendlyAvailability } from '@/lib/calendly-availability'

/**
 * Interroge `/api/calendly/status` (vérification côté serveur : l'API Calendly n'est pas lisible
 * depuis le navigateur). Tant que la réponse n'est pas là — ou si l'adresse a changé — on renvoie
 * `unknown` : l'agenda s'affiche normalement, on ne le remplace jamais par erreur.
 */
export function useCalendlyAvailability(url: string | undefined): CalendlyAvailability {
  const [result, setResult] = useState<{ url: string; availability: CalendlyAvailability } | null>(null)

  useEffect(() => {
    if (!url) return
    let alive = true
    fetch(`/api/calendly/status?url=${encodeURIComponent(url)}`)
      .then(r => (r.ok ? r.json() : { availability: 'unknown' }))
      .then((d: { availability?: CalendlyAvailability }) => {
        if (alive) setResult({ url, availability: d.availability ?? 'unknown' })
      })
      .catch(() => { if (alive) setResult({ url, availability: 'unknown' }) })
    return () => { alive = false }
  }, [url])

  // Résultat périmé (adresse changée depuis) : on ignore, l'agenda reprend la main.
  return result && result.url === url ? result.availability : 'unknown'
}
