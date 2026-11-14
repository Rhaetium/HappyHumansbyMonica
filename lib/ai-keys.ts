// Clés des fournisseurs d'IA : valeurs de Vercel (prioritaires) ou saisies dans le CMS (chiffrées en base).
// Les fonctions « build… » et « …Status » sont pures et testées ; le reste lit ou écrit cms_settings_kv.
import { createClient } from '@supabase/supabase-js'
import { getKvSettings } from '@/lib/cms-settings-server'
import { decryptSecret, encryptSecret, secretBoxSecret } from '@/lib/secret-box'
import {
  PREFERRED_KV_KEY,
  PROVIDERS,
  PROVIDER_IDS,
  kvKeyFor,
  providerById,
  type ProviderField,
  type ProviderInfo,
} from '@/lib/ai-providers'

type Env = Record<string, string | undefined>
type Kv = Record<string, string>

type Resolved = { value: string; source: 'vercel' | 'cms'; unreadable?: false } | { value: ''; source: 'cms'; unreadable: true } | null

/** Valeur d'un champ : Vercel d'abord, sinon le CMS (déchiffré pour les secrets). */
function resolveField(field: ProviderField, kv: Kv, env: Env): Resolved {
  const fromEnv = env[field.env]?.trim()
  if (fromEnv) return { value: fromEnv, source: 'vercel' }
  const stored = kv[kvKeyFor(field)]?.trim()
  if (!stored) return null
  if (!field.secret) return { value: stored, source: 'cms' }
  const secret = secretBoxSecret(env)
  const plain = secret ? decryptSecret(stored, secret) : null
  return plain ? { value: plain, source: 'cms' } : { value: '', source: 'cms', unreadable: true }
}

/** Variables d'environnement « virtuelles » pour lib/ai-text : Vercel + CMS fusionnés, le fournisseur préféré en plus. */
export function buildAiEnv(kv: Kv, processEnv: Env): Env {
  const out: Env = {}
  for (const provider of PROVIDERS) {
    for (const field of provider.fields) {
      const r = resolveField(field, kv, processEnv)
      if (r && r.value) out[field.env] = r.value
    }
  }
  const preferred = processEnv.AI_PROVIDER?.trim() || kv[PREFERRED_KV_KEY]?.trim()
  if (preferred) out.AI_PROVIDER = preferred
  return out
}

export async function loadAiEnv(): Promise<Env> {
  return buildAiEnv(await getKvSettings(), process.env)
}

export type FieldStatus = {
  env: string
  label: string
  secret: boolean
  optional: boolean
  placeholder?: string
  set: boolean
  source: 'vercel' | 'cms' | null
  /** Une clé est enregistrée mais ne peut plus être lue (le secret de chiffrement a changé). */
  unreadable: boolean
  /** Valeur affichable : uniquement pour les réglages qui ne sont pas des secrets. */
  value?: string
}

export type ProviderStatus = Pick<ProviderInfo, 'id' | 'label' | 'free' | 'note' | 'help'> & {
  configured: boolean
  source: 'vercel' | 'cms' | 'mixed' | null
  fields: FieldStatus[]
}

export type AiKeysStatus = { providers: ProviderStatus[]; preferred: string; canStore: boolean }

/** État affiché dans l'admin. Ne contient JAMAIS la valeur d'un secret. */
export function aiKeysStatus(kv: Kv, processEnv: Env): AiKeysStatus {
  const providers = PROVIDERS.map((p): ProviderStatus => {
    const fields = p.fields.map((f): FieldStatus => {
      const r = resolveField(f, kv, processEnv)
      return {
        env: f.env,
        label: f.label,
        secret: f.secret,
        optional: !!f.optional,
        placeholder: f.placeholder,
        set: !!r && !r.unreadable,
        source: r ? r.source : null,
        unreadable: !!r?.unreadable,
        ...(!f.secret && r && !r.unreadable ? { value: r.value } : {}),
      }
    })
    const required = fields.filter(f => !f.optional)
    const sources = new Set(required.filter(f => f.set).map(f => f.source))
    return {
      id: p.id, label: p.label, free: p.free, note: p.note, help: p.help,
      configured: required.every(f => f.set),
      source: sources.size === 0 ? null : sources.size === 1 ? ([...sources][0] as 'vercel' | 'cms') : 'mixed',
      fields,
    }
  })
  const preferred = (processEnv.AI_PROVIDER?.trim() || kv[PREFERRED_KV_KEY]?.trim() || '')
  return { providers, preferred: PROVIDER_IDS.includes(preferred as never) ? preferred : '', canStore: !!secretBoxSecret(processEnv) }
}

// ── Écriture (routes /api/cms/ai-keys, après authentification CMS) ───────────────────────────────

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

export class AiKeysError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Enregistre des valeurs pour un fournisseur : secrets chiffrés, autres réglages en clair. Une valeur absente reste inchangée. */
export async function saveProviderValues(providerId: string, values: Record<string, string>): Promise<void> {
  const provider = providerById(providerId)
  if (!provider) throw new AiKeysError('Fournisseur inconnu.', 400)
  const client = db()
  if (!client) throw new AiKeysError('Base de données non configurée.', 503)
  const secret = secretBoxSecret()
  const rows: { key: string; value: string; updated_at: string }[] = []
  for (const field of provider.fields) {
    const v = values[field.env]
    if (!v) continue
    if (field.secret && !secret) throw new AiKeysError('Définissez d’abord CMS_PASSWORD dans Vercel : il sert à chiffrer les clés.', 503)
    rows.push({ key: kvKeyFor(field), value: field.secret ? encryptSecret(v, secret!) : v, updated_at: new Date().toISOString() })
  }
  if (rows.length === 0) return
  const { error } = await client.from('cms_settings_kv').upsert(rows, { onConflict: 'key' })
  if (error) throw new AiKeysError(error.message, 500)
}

/** Retire les valeurs enregistrées dans le CMS (celles de Vercel ne sont pas touchées). */
export async function clearProviderValues(providerId: string): Promise<void> {
  const provider = providerById(providerId)
  if (!provider) throw new AiKeysError('Fournisseur inconnu.', 400)
  const client = db()
  if (!client) throw new AiKeysError('Base de données non configurée.', 503)
  const { error } = await client.from('cms_settings_kv').delete().in('key', provider.fields.map(kvKeyFor))
  if (error) throw new AiKeysError(error.message, 500)
}

export async function savePreferredProvider(id: string): Promise<void> {
  if (id !== '' && !PROVIDER_IDS.includes(id as never)) throw new AiKeysError('Fournisseur inconnu.', 400)
  const client = db()
  if (!client) throw new AiKeysError('Base de données non configurée.', 503)
  const { error } = await client.from('cms_settings_kv').upsert({ key: PREFERRED_KV_KEY, value: id, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new AiKeysError(error.message, 500)
}
