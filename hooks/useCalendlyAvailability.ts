'use client'
import { useEffect, useState } from 'react'
import type { CalendlyAvailability } from '@/lib/calendly-availability'

/**
 * Résultats partagés, un par adresse. Une même page peut poser deux fois la question — le message
 * de repli de la page « Réserver » et l'agenda intégré interrogent la même adresse — et deux appels
 * séparés peuvent se contredire (Calendly limite le débit : l'un répond, l'autre « on ne sait pas »).
 * Un seul appel par adresse garantit un affichage cohérent.
 */
const FRESH_MS = 60_000
const cache = new Map<string, { at: number; availability: CalendlyAvailability }>()
const inflight = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()

function refresh(url: string): void {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.at < FRESH_MS) return
  if (inflight.has(url)) return
  const request = fetch(`/api/calendly/status?url=${encodeURIComponent(url)}`)
    .then(r => (r.ok ? r.json() : { availability: 'unknown' }))
    .then((d: { availability?: CalendlyAvailability }) => {
      cache.set(url, { at: Date.now(), availability: d.availability ?? 'unknown' })
    })
    .catch(() => { cache.set(url, { at: Date.now(), availability: 'unknown' }) })
    .finally(() => {
      inflight.delete(url)
      listeners.forEach(l => l())
    })
  inflight.set(url, request)
}

/**
 * Interroge `/api/calendly/status` (vérification côté serveur : l'API Calendly n'est pas lisible
 * depuis le navigateur). Tant que la réponse n'est pas là — ou si l'adresse a changé — on renvoie
 * `unknown` : l'agenda s'affiche normalement, on ne le remplace jamais par erreur.
 */
export function useCalendlyAvailability(url: string | undefined): CalendlyAvailability {
  const [, bump] = useState(0)

  useEffect(() => {
    if (!url) return
    const onChange = () => bump(n => n + 1)
    listeners.add(onChange)
    refresh(url)
    return () => { listeners.delete(onChange) }
  }, [url])

  return (url && cache.get(url)?.availability) || 'unknown'
}
