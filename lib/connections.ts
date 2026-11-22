// Connexions du site (e-mails, Instagram, Unsplash) : valeurs de Vercel (prioritaires) ou saisies dans le CMS.
// Les secrets sont chiffrés en base (même mécanisme que les clés d'IA) et ne sont JAMAIS renvoyés au navigateur.
// Les fonctions « check », « resolve… » et « …Status » sont pures et testées ; le reste lit ou écrit cms_settings_kv.
import { createClient } from '@supabase/supabase-js'
import { getKvSettings } from '@/lib/cms-settings-server'
import { decryptSecret, encryptSecret, secretBoxSecret } from '@/lib/secret-box'

export type ConnectionId = 'email' | 'instagram' | 'unsplash'

export type ConnectionField = {
  /** Nom de la variable d'environnement correspondante (celle de Vercel). */
  env: string
  label: string
  /** Secret : chiffré en base, jamais renvoyé au navigateur. Sinon : réglage simple, affichable. */
  secret: boolean
  optional?: boolean
  placeholder?: string
  /** Renvoie un message d'erreur, ou null si la valeur est plausible. */
  check: (value: string) => string | null
}

export type ConnectionInfo = {
  id: ConnectionId
  label: string
  emoji: string
  note: string
  help?: { url: string; label: string }
  fields: ConnectionField[]
}

const noSpace = (v: string): string | null => (/\s/.test(v) ? 'Ne doit contenir ni espace ni retour à la ligne.' : null)
const token = (min: number, max: number) => (v: string): string | null =>
  noSpace(v) ?? (v.length < min || v.length > max ? 'Longueur inattendue : recopiez la valeur en entier.' : null)
const email = (v: string): string | null =>
  v.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(v) ? null : 'Adresse e-mail invalide.'

export const CONNECTIONS: ConnectionInfo[] = [
  {
    id: 'email',
    label: 'E-mails (Brevo)',
    emoji: '📧',
    note: 'Envoie les confirmations aux visiteurs, vous prévient des messages et réservations, et inscrit à la newsletter. Sans clé Brevo, rien n’est envoyé.',
    help: { url: 'https://app.brevo.com/settings/keys/api', label: 'Créer une clé (Brevo)' },
    fields: [
      {
        env: 'BREVO_API_KEY', label: 'Clé API Brevo', secret: true, placeholder: 'xkeysib-…',
        check: v => noSpace(v) ?? (v.startsWith('xkeysib-') ? (v.length > 20 && v.length < 300 ? null : 'Clé incomplète : recopiez-la en entier.') : 'Une clé Brevo commence par « xkeysib- ».'),
      },
      { env: 'ADMIN_EMAIL', label: 'Adresse qui reçoit les notifications', secret: false, placeholder: 'vous@exemple.fr', check: email },
      { env: 'SENDER_EMAIL', label: 'Adresse d’expédition (validée dans Brevo)', secret: false, placeholder: 'contact@exemple.fr', check: email },
      {
        env: 'SENDER_NAME', label: 'Nom d’expéditeur', secret: false, optional: true, placeholder: 'Happy Humans',
        check: v => (/[<>\r\n]/.test(v) || v.length < 2 || v.length > 80 ? 'Entre 2 et 80 caractères, sans < > ni retour à la ligne.' : null),
      },
    ],
  },
  {
    id: 'instagram',
    label: 'Publication Instagram',
    emoji: '📸',
    note: 'Permet de publier un carrousel sur Instagram depuis le CMS. Le jeton Meta expire environ tous les 60 jours : c’est ici qu’on le renouvelle.',
    help: { url: 'https://developers.facebook.com/tools/explorer/', label: 'Générer un jeton (Meta)' },
    fields: [
      { env: 'INSTAGRAM_ACCESS_TOKEN', label: 'Jeton d’accès (longue durée)', secret: true, placeholder: 'EAA…', check: token(20, 1000) },
      {
        env: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', label: 'Identifiant du compte Instagram professionnel', secret: false, placeholder: '1784…',
        check: v => (/^\d{6,25}$/.test(v) ? null : 'Uniquement des chiffres (6 à 25).'),
      },
    ],
  },
  {
    id: 'unsplash',
    label: 'Photos Unsplash',
    emoji: '🖼️',
    note: 'Facultatif. Ajoute des photos aux carrousels générés. Sans clé, les carrousels sont créés sans photo.',
    help: { url: 'https://unsplash.com/oauth/applications', label: 'Créer une clé (Unsplash)' },
    fields: [
      { env: 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', label: 'Clé d’accès Unsplash', secret: true, optional: true, placeholder: 'Access Key', check: token(20, 120) },
    ],
  },
]

export const CONNECTION_IDS = CONNECTIONS.map(c => c.id)
export const connectionById = (id: string): ConnectionInfo | undefined => CONNECTIONS.find(c => c.id === id)

/** Clé de stockage : « secret_… » pour un secret (la route générale des réglages refuse d'y écrire), « conn_… » sinon. */
export const kvKeyFor = (field: ConnectionField): string => `${field.secret ? 'secret_conn_' : 'conn_'}${field.env.toLowerCase()}`

type Env = Record<string, string | undefined>
type Kv = Record<string, string>
type Resolved = { value: string; source: 'vercel' | 'cms'; unreadable?: false } | { value: ''; source: 'cms'; unreadable: true } | null

/** Valeur d'un champ : Vercel d'abord, sinon le CMS (déchiffré pour les secrets). */
function resolveField(field: ConnectionField, kv: Kv, env: Env): Resolved {
  const fromEnv = env[field.env]?.trim()
  if (fromEnv) return { value: fromEnv, source: 'vercel' }
  const stored = kv[kvKeyFor(field)]?.trim()
  if (!stored) return null
  if (!field.secret) return { value: stored, source: 'cms' }
  const secret = secretBoxSecret(env)
  const plain = secret ? decryptSecret(stored, secret) : null
  return plain ? { value: plain, source: 'cms' } : { value: '', source: 'cms', unreadable: true }
}

/** Valeurs utilisables de toutes les connexions (Vercel + CMS fusionnés), par nom de variable. Un champ absent n'y figure pas. */
export function buildConnectionEnv(kv: Kv, processEnv: Env): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of CONNECTIONS) {
    for (const f of c.fields) {
      const r = resolveField(f, kv, processEnv)
      if (r && r.value) out[f.env] = r.value
    }
  }
  return out
}

/** À appeler côté serveur à la place de process.env pour ces variables : Vercel prioritaire, sinon CMS. */
export async function loadConnectionEnv(): Promise<Record<string, string | undefined>> {
  return buildConnectionEnv(await getKvSettings(), process.env)
}

export type FieldStatus = {
  env: string
  label: string
  secret: boolean
  optional: boolean
  placeholder?: string
  set: boolean
  source: 'vercel' | 'cms' | null
  /** Une valeur est enregistrée mais illisible (le secret de chiffrement a changé) : il faut la ressaisir. */
  unreadable: boolean
  /** Valeur affichable : uniquement pour les réglages qui ne sont pas des secrets. */
  value?: string
}
export type ConnectionStatus = Pick<ConnectionInfo, 'id' | 'label' | 'emoji' | 'note' | 'help'> & {
  configured: boolean
  source: 'vercel' | 'cms' | 'mixed' | null
  fields: FieldStatus[]
}
export type ConnectionsStatus = { connections: ConnectionStatus[]; canStore: boolean }

/** État affichable : jamais la valeur d'un secret. */
export function connectionsStatus(kv: Kv, processEnv: Env): ConnectionsStatus {
  const connections = CONNECTIONS.map(c => {
    const fields: FieldStatus[] = c.fields.map(f => {
      const r = resolveField(f, kv, processEnv)
      const set = !!r && !r.unreadable
      return {
        env: f.env, label: f.label, secret: f.secret, optional: !!f.optional, placeholder: f.placeholder,
        set, source: r ? r.source : null, unreadable: !!r?.unreadable,
        ...(set && !f.secret && r ? { value: r.value } : {}),
      }
    })
    const required = fields.filter(f => !f.optional)
    const sources = new Set(required.filter(f => f.set).map(f => f.source))
    return {
      id: c.id, label: c.label, emoji: c.emoji, note: c.note, help: c.help,
      // Sans champ obligatoire (service facultatif), « connecté » veut dire qu'au moins une valeur est renseignée.
      configured: required.length > 0 ? required.every(f => f.set) : fields.some(f => f.set),
      source: sources.size === 0 ? null : sources.size === 1 ? ([...sources][0] as 'vercel' | 'cms') : ('mixed' as const),
      fields,
    }
  })
  return { connections, canStore: !!secretBoxSecret(processEnv) }
}

/** Valide les valeurs saisies pour une connexion : seules les variables connues, non vides, plausibles. */
export function validateConnectionValues(
  connection: ConnectionInfo,
  values: Record<string, unknown>,
): { ok: true; values: Record<string, string> } | { ok: false; error: string } {
  const clean: Record<string, string> = {}
  for (const [name, raw] of Object.entries(values)) {
    const field = connection.fields.find(f => f.env === name)
    if (!field) return { ok: false, error: `Réglage inconnu : ${name}.` }
    if (typeof raw !== 'string') return { ok: false, error: `${field.label} : valeur invalide.` }
    const v = raw.trim()
    if (!v) continue // un champ vide veut dire « inchangé »
    const problem = field.check(v)
    if (problem) return { ok: false, error: `${field.label} : ${problem}` }
    clean[name] = v
  }
  return { ok: true, values: clean }
}

/** Teste une clé Brevo auprès de Brevo avant de l'enregistrer. 'unreachable' = on n'a pas pu vérifier. */
export async function verifyBrevoKey(key: string, fetchImpl: typeof fetch = fetch): Promise<'valid' | 'invalid' | 'unreachable'> {
  try {
    const res = await fetchImpl('https://api.brevo.com/v3/account', {
      headers: { 'api-key': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    if (res.ok) return 'valid'
    return res.status === 401 || res.status === 403 ? 'invalid' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

// ── Écriture (route /api/cms/connections, après authentification CMS) ───────────────────────────────

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

export class ConnectionsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Enregistre des valeurs : secrets chiffrés, autres réglages en clair. Une valeur absente reste inchangée. */
export async function saveConnectionValues(id: string, values: Record<string, string>): Promise<void> {
  const connection = connectionById(id)
  if (!connection) throw new ConnectionsError('Connexion inconnue.', 400)
  const client = db()
  if (!client) throw new ConnectionsError('Base de données non configurée.', 503)
  const secret = secretBoxSecret()
  const rows: { key: string; value: string; updated_at: string }[] = []
  for (const field of connection.fields) {
    const v = values[field.env]
    if (!v) continue
    if (field.secret && !secret) throw new ConnectionsError('Définissez d’abord CMS_PASSWORD dans Vercel : il sert à chiffrer les clés.', 503)
    rows.push({ key: kvKeyFor(field), value: field.secret ? encryptSecret(v, secret!) : v, updated_at: new Date().toISOString() })
  }
  if (rows.length === 0) return
  const { error } = await client.from('cms_settings_kv').upsert(rows, { onConflict: 'key' })
  if (error) throw new ConnectionsError(error.message, 500)
}

/** Retire les valeurs enregistrées dans le CMS (celles de Vercel ne sont pas touchées). */
export async function clearConnectionValues(id: string): Promise<void> {
  const connection = connectionById(id)
  if (!connection) throw new ConnectionsError('Connexion inconnue.', 400)
  const client = db()
  if (!client) throw new ConnectionsError('Base de données non configurée.', 503)
  const { error } = await client.from('cms_settings_kv').delete().in('key', connection.fields.map(kvKeyFor))
  if (error) throw new ConnectionsError(error.message, 500)
}
