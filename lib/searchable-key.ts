// Clé d'API Searchable : variable Vercel SEARCHABLE_API_KEY (prioritaire) ou saisie dans le CMS (chiffrée en base,
// comme les clés d'IA). La valeur n'est jamais renvoyée au navigateur : on n'expose que « configurée ou non ».
import { createClient } from '@supabase/supabase-js'
import { getKvSettings } from '@/lib/cms-settings-server'
import { decryptSecret, encryptSecret, secretBoxSecret } from '@/lib/secret-box'

export const SEARCHABLE_KV_KEY = 'secret_searchable_api_key'

type Env = Record<string, string | undefined>

/** Les clés Searchable commencent par « sea_ ». On refuse tout le reste avant même de l'envoyer. */
export function isValidSearchableKey(value: string): boolean {
  return /^sea_[A-Za-z0-9]{16,80}$/.test(value.trim())
}

export type ResolvedKey =
  | { value: string; source: 'vercel' | 'cms'; unreadable?: false }
  | { value: ''; source: 'cms'; unreadable: true }
  | null

/** Pure : Vercel d'abord, sinon le CMS (déchiffré). */
export function resolveSearchableKey(kv: Record<string, string>, env: Env): ResolvedKey {
  const fromEnv = env.SEARCHABLE_API_KEY?.trim()
  if (fromEnv) return { value: fromEnv, source: 'vercel' }
  const stored = kv[SEARCHABLE_KV_KEY]?.trim()
  if (!stored) return null
  const secret = secretBoxSecret(env)
  const plain = secret ? decryptSecret(stored, secret) : null
  return plain ? { value: plain, source: 'cms' } : { value: '', source: 'cms', unreadable: true }
}

export async function loadSearchableKey(): Promise<ResolvedKey> {
  return resolveSearchableKey(await getKvSettings(), process.env)
}

export type SearchableKeyStatus = {
  configured: boolean
  source: 'vercel' | 'cms' | null
  /** Une clé est enregistrée mais illisible (le secret de chiffrement a changé) : il faut la ressaisir. */
  unreadable: boolean
  /** Le CMS peut enregistrer une clé (un secret de chiffrement existe). */
  canStore: boolean
}

export function searchableKeyStatus(kv: Record<string, string>, env: Env): SearchableKeyStatus {
  const r = resolveSearchableKey(kv, env)
  return {
    configured: !!r && !r.unreadable,
    source: r ? r.source : null,
    unreadable: !!r?.unreadable,
    canStore: !!secretBoxSecret(env),
  }
}

export class SearchableKeyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

export async function saveSearchableKey(value: string): Promise<void> {
  const client = db()
  if (!client) throw new SearchableKeyError('Base de données non configurée.', 503)
  const secret = secretBoxSecret()
  if (!secret) throw new SearchableKeyError('Définissez d’abord CMS_PASSWORD dans Vercel : il sert à chiffrer la clé.', 503)
  const { error } = await client.from('cms_settings_kv').upsert(
    { key: SEARCHABLE_KV_KEY, value: encryptSecret(value.trim(), secret), updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
  if (error) throw new SearchableKeyError(error.message, 500)
}

/** Retire la clé enregistrée dans le CMS (celle de Vercel n'est pas touchée). */
export async function clearSearchableKey(): Promise<void> {
  const client = db()
  if (!client) throw new SearchableKeyError('Base de données non configurée.', 503)
  const { error } = await client.from('cms_settings_kv').delete().eq('key', SEARCHABLE_KV_KEY)
  if (error) throw new SearchableKeyError(error.message, 500)
}
