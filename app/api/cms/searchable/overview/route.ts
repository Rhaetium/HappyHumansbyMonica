import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getKvSettings } from '@/lib/cms-settings-server'
import { SearchableError, fetchOverview, type SearchableOverview } from '@/lib/searchable-api'
import { loadSearchableKey, searchableKeyStatus } from '@/lib/searchable-key'
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const TTL_MS = 5 * 60 * 1000
let cache: { at: number; fingerprint: string; value: SearchableOverview } | null = null

/**
 * GET /api/cms/searchable/overview — visibilité dans les IA, opportunités, audits et thèmes (données Searchable).
 *
 * Réservé à l'administration. La clé reste sur le serveur. Mise en cache 5 minutes (`?refresh=1` pour forcer).
 * Réponses : 200 `{ configured: false, … }` tant qu'aucune clé n'est installée (état normal, l'interface explique) ;
 * 200 `{ configured: true, overview }` ; 502 `{ error, hint }` si Searchable refuse ou ne répond pas.
 */
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const key = await loadSearchableKey()
  if (!key || key.unreadable) {
    const status = searchableKeyStatus(await getKvSettings(), process.env)
    return NextResponse.json({ configured: false, unreadable: status.unreadable, canStore: status.canStore }, { headers: NO_STORE })
  }

  const fingerprint = key.value.slice(-6) // distingue deux clés sans jamais garder la clé en entier
  const refresh = req.nextUrl.searchParams.get('refresh') === '1'
  if (!refresh && cache && cache.fingerprint === fingerprint && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ configured: true, overview: cache.value }, { headers: NO_STORE })
  }

  try {
    const overview = await fetchOverview(key.value, {
      projectId: process.env.SEARCHABLE_PROJECT_ID?.trim(),
      domainHint: SITE_URL,
    })
    cache = { at: Date.now(), fingerprint, value: overview }
    return NextResponse.json({ configured: true, overview }, { headers: NO_STORE })
  } catch (err) {
    if (err instanceof SearchableError) {
      return NextResponse.json({ configured: true, error: err.message, hint: err.hint }, { status: 502, headers: NO_STORE })
    }
    return NextResponse.json(
      { configured: true, error: 'Impossible de lire les chiffres pour le moment.', hint: 'Réessayez dans quelques minutes.' },
      { status: 502, headers: NO_STORE },
    )
  }
}
