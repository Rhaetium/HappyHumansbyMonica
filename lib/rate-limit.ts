// Limite de tentatives (connexion à l'admin) : après `max` échecs dans la fenêtre, on refuse jusqu'à la fin de la fenêtre.
// Fonctions pures + stockage en mémoire, testées dans __tests__/lib/rate-limit.test.ts.
//
// Limite connue : sur Vercel chaque instance serverless a sa propre mémoire, donc la limite est « au mieux »
// (un attaquant très patient peut tomber sur plusieurs instances). Elle arrête néanmoins les essais en rafale.
// Un compteur partagé (table Supabase) viendrait en complément si besoin.

export type Attempt = { count: number; resetAt: number }
export type RateStore = Map<string, Attempt>

export const LOGIN_MAX_FAILURES = 5
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
/** Au-delà, on purge les entrées expirées pour que la mémoire ne grossisse pas. */
const MAX_ENTRIES = 5000

const defaultStore: RateStore = new Map()

/** Secondes à attendre avant de pouvoir réessayer ; 0 si la clé n'est pas bloquée. */
export function retryAfterSeconds(key: string, now = Date.now(), store: RateStore = defaultStore, max = LOGIN_MAX_FAILURES): number {
  const a = store.get(key)
  if (!a || a.resetAt <= now || a.count < max) return 0
  return Math.ceil((a.resetAt - now) / 1000)
}

export function recordFailure(key: string, now = Date.now(), store: RateStore = defaultStore, windowMs = LOGIN_WINDOW_MS): void {
  if (store.size > MAX_ENTRIES) {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k)
  }
  const a = store.get(key)
  if (!a || a.resetAt <= now) store.set(key, { count: 1, resetAt: now + windowMs })
  else a.count += 1
}

export function clearFailures(key: string, store: RateStore = defaultStore): void {
  store.delete(key)
}

/** Adresse du visiteur : sur Vercel, `x-forwarded-for` est posé par la plateforme (premier élément = visiteur). */
export function clientKey(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return fwd || headers.get('x-real-ip')?.trim() || 'inconnu'
}
