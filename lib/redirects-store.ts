import { parseRedirects, REDIRECTS_KEY, REDIRECTS_PAGE, type RedirectRule } from '@/lib/redirects'

/**
 * Lecture des redirections pour le proxy (chaque requête passe par là). On garde la liste en mémoire 60 secondes :
 * au plus une lecture de la base par minute et par instance, pas une par visiteur. Si la base est indisponible,
 * on garde la dernière liste connue (ou aucune) : le site ne casse jamais à cause des redirections.
 */
const TTL_MS = 60_000
let cache: { at: number; rules: RedirectRule[] } | null = null
let inflight: Promise<RedirectRule[]> | null = null

async function fetchRules(): Promise<RedirectRule[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const res = await fetch(
    `${url}/rest/v1/site_content?select=value&page=eq.${REDIRECTS_PAGE}&block_key=eq.${REDIRECTS_KEY}&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(2500) },
  )
  if (!res.ok) throw new Error(`redirections : ${res.status}`)
  const rows = (await res.json()) as { value: string | null }[]
  return parseRedirects(rows[0]?.value)
}

export async function getRedirects(): Promise<RedirectRule[]> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.rules
  inflight ??= fetchRules()
    .then(rules => { cache = { at: Date.now(), rules }; return rules })
    .catch(() => {
      // base en panne : on réessaie dans une minute, en attendant on sert la dernière liste connue
      cache = { at: Date.now(), rules: cache?.rules ?? [] }
      return cache.rules
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Pour les tests. */
export function resetRedirectsCache() { cache = null; inflight = null }
