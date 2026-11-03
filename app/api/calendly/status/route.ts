import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calendlyAvailabilityFromProfile,
  calendlyProfileApiUrl,
  calendlyProfileSlug,
} from '@/lib/calendly-availability'
import { sendEmail, adminNotifHtml } from '@/lib/send-email'
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'

/**
 * Vérifie qu'un compte Calendly a bien des rendez-vous publics.
 *
 * Appelé par l'agenda intégré (page « Réserver ») : si le compte n'a rien de public, la page
 * affiche un message clair à la place d'une iframe vide, et une alerte est déposée dans le CMS
 * (onglet 💬 Messages) pour prévenir Monica. Voir `lib/calendly-availability.ts`.
 */

/** Fenêtre anti-doublon : une seule alerte par compte toutes les 6 h (la page est publique). */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000
const ALERT_TYPE = 'booking_alert'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Dépose une alerte dans le CMS (et par email) — sans jamais bloquer la réponse au visiteur.
 * L'adresse interrogée est reconstruite à partir du seul slug : impossible de viser un autre hôte.
 */
async function recordAlert(slug: string, profileUrl: string) {
  const supabase = getSupabase()
  if (!supabase) return

  const since = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString()
  const { data: existing } = await supabase
    .from('contact_messages')
    .select('id')
    .eq('type', ALERT_TYPE)
    .gte('created_at', since)
    .limit(1)
  if (existing && existing.length > 0) return

  const message =
    `Le compte Calendly « ${slug} » (${profileUrl}) n'a aucun rendez-vous public : ` +
    `les visiteurs voient « Aucune disponibilité pour le moment » au lieu de l'agenda, donc personne ne peut réserver.\n\n` +
    `À faire : dans Calendly, créez et publiez au moins un type de rendez-vous. ` +
    `Ensuite, saisissez son adresse dans ⚙️ Paramètres → 📅 Réservation.`

  const { error } = await supabase.from('contact_messages').insert({
    name: 'Alerte réservation (Calendly)',
    email: DEFAULT_CONTACT_EMAIL,
    message,
    type: ALERT_TYPE,
    status: 'unread',
  })
  if (error) console.error('[calendly/status] insertion alerte impossible:', error.message)

  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_CONTACT_EMAIL
  await sendEmail({
    to: adminEmail,
    subject: '⚠️ Réservation impossible — Calendly sans rendez-vous public',
    html: adminNotifHtml({ name: 'Alerte réservation (Calendly)', message }),
  }).catch(() => {})
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? ''
  const slug = calendlyProfileSlug(raw)
  const apiUrl = calendlyProfileApiUrl(slug)

  if (!apiUrl) {
    return NextResponse.json(
      { availability: 'unknown' },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    )
  }

  let availability: 'available' | 'unavailable' | 'unknown' = 'unknown'
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'HappyHumans-booking-check' },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    availability = res.ok ? calendlyAvailabilityFromProfile(await res.json()) : 'unknown'
  } catch {
    availability = 'unknown'
  }

  // L'alerte ne doit jamais faire échouer ni retarder la réponse : on ne l'attend pas.
  if (availability === 'unavailable') void recordAlert(slug, raw).catch(() => {})

  return NextResponse.json(
    { availability, profile: slug },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  )
}
