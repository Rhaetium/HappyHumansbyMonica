// Stockage de la double authentification dans cms_settings_kv (clés « secret_… » : jamais sauvegardées en clair, jamais renvoyées au navigateur).
// La clé TOTP et les empreintes des codes de secours sont chiffrées (AES-256-GCM) avec CMS_SESSION_SECRET (lib/secret-box.ts).
import { createClient } from '@supabase/supabase-js'
import { decryptSecret, encryptSecret, secretBoxSecret } from '@/lib/secret-box'

const KEY = 'secret_totp'
const PENDING_KEY = 'secret_totp_pending'

export type TwoFactorState = { secret: string; recovery: string[]; enabledAt: string }

export type TwoFactorRead =
  | { status: 'off' }
  | { status: 'on'; state: TwoFactorState }
  /** Impossible de savoir (base indisponible, secret de chiffrement changé) : l'appelant doit refuser par prudence. */
  | { status: 'error'; reason: string }

/** Interrupteur de secours : CMS_2FA_DISABLE=1 dans Vercel désactive la double authentification (téléphone ET codes perdus). */
export const twoFactorForcedOff = () => process.env.CMS_2FA_DISABLE?.trim() === '1'

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key) : null
}

async function readRow(key: string): Promise<{ value: string | null } | null | 'error'> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb.from('cms_settings_kv').select('value').eq('key', key).maybeSingle()
  if (error) return 'error'
  return data ?? null
}

export async function readTwoFactor(): Promise<TwoFactorRead> {
  if (twoFactorForcedOff()) return { status: 'off' }
  if (!client()) return { status: 'off' } // pas de base : rien n'a pu être activé
  const row = await readRow(KEY)
  if (row === 'error') return { status: 'error', reason: 'Base de données indisponible.' }
  if (!row?.value) return { status: 'off' }
  const secret = secretBoxSecret()
  const plain = secret ? decryptSecret(row.value, secret) : null
  if (!plain) return { status: 'error', reason: 'Double authentification illisible (secret de chiffrement modifié ?).' }
  try {
    const state = JSON.parse(plain) as TwoFactorState
    if (typeof state.secret !== 'string' || !Array.isArray(state.recovery)) throw new Error('forme')
    return { status: 'on', state }
  } catch {
    return { status: 'error', reason: 'Double authentification illisible.' }
  }
}

async function upsert(key: string, value: string): Promise<boolean> {
  const sb = client()
  if (!sb) return false
  const { error } = await sb.from('cms_settings_kv').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return !error
}

export async function saveTwoFactor(state: TwoFactorState): Promise<boolean> {
  const secret = secretBoxSecret()
  if (!secret) return false
  const ok = await upsert(KEY, encryptSecret(JSON.stringify(state), secret))
  if (ok) await client()?.from('cms_settings_kv').delete().eq('key', PENDING_KEY)
  return ok
}

export async function deleteTwoFactor(): Promise<boolean> {
  const sb = client()
  if (!sb) return false
  const { error } = await sb.from('cms_settings_kv').delete().in('key', [KEY, PENDING_KEY])
  return !error
}

export async function savePending(totpSecret: string): Promise<boolean> {
  const secret = secretBoxSecret()
  return secret ? upsert(PENDING_KEY, encryptSecret(totpSecret, secret)) : false
}

export async function readPending(): Promise<string | null> {
  const secret = secretBoxSecret()
  const row = await readRow(PENDING_KEY)
  if (!secret || !row || row === 'error' || !row.value) return null
  return decryptSecret(row.value, secret)
}
