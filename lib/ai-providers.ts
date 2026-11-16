// Catalogue des fournisseurs d'IA et validation des clés saisies dans le CMS. Logique pure, testée.
// Les noms de variables (ANTHROPIC_API_KEY…) sont ceux de Vercel : une valeur Vercel l'emporte toujours
// sur une valeur saisie dans le CMS.

export type AiProviderId = 'anthropic' | 'cloudflare' | 'groq' | 'gemini'

export type ProviderField = {
  /** Nom de la variable d'environnement correspondante. */
  env: string
  label: string
  /** Secret : chiffré en base et jamais renvoyé au navigateur. Sinon : réglage simple, affichable. */
  secret: boolean
  optional?: boolean
  placeholder?: string
  /** Renvoie un message d'erreur, ou null si la valeur est plausible. */
  check: (value: string) => string | null
}

export type ProviderInfo = {
  id: AiProviderId
  label: string
  free: boolean
  note: string
  help: { url: string; label: string }
  fields: ProviderField[]
}

const common = (v: string): string | null => {
  if (/\s/.test(v)) return 'La clé ne doit contenir ni espace ni retour à la ligne.'
  if (v.length < 8 || v.length > 600) return 'Longueur inattendue : recopiez la clé en entier.'
  return null
}
const withPrefix = (prefix: string, hint: string) => (v: string) => common(v) ?? (v.startsWith(prefix) ? null : `Une clé ${hint} commence par « ${prefix} ».`)

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    free: true,
    note: 'Quota quotidien gratuit. Bon français. Les demandes envoyées à l’offre gratuite peuvent servir à améliorer les produits de Google : n’y mettez pas de données de clients.',
    help: { url: 'https://aistudio.google.com/apikey', label: 'Créer une clé (Google AI Studio)' },
    fields: [
      { env: 'GEMINI_API_KEY', label: 'Clé API Gemini', secret: true, placeholder: 'AIza…', check: withPrefix('AIza', 'Gemini') },
      { env: 'GEMINI_MODEL', label: 'Modèle (facultatif)', secret: false, optional: true, placeholder: 'gemini-2.5-flash', check: v => (/^[a-z0-9.-]{3,60}$/i.test(v) ? null : 'Nom de modèle invalide.') },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    free: true,
    note: 'Gratuit, très rapide. Quota limité par minute.',
    help: { url: 'https://console.groq.com/keys', label: 'Créer une clé (console Groq)' },
    fields: [{ env: 'GROQ_API_KEY', label: 'Clé API Groq', secret: true, placeholder: 'gsk_…', check: withPrefix('gsk_', 'Groq') }],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    free: true,
    note: 'Offre gratuite quotidienne. Demande deux valeurs : l’identifiant du compte et un jeton avec la permission « Workers AI ».',
    help: { url: 'https://dash.cloudflare.com/profile/api-tokens', label: 'Créer un jeton (Cloudflare)' },
    fields: [
      { env: 'CLOUDFLARE_ACCOUNT_ID', label: 'Identifiant du compte', secret: true, placeholder: '32 caractères', check: v => (/^[a-f0-9]{32}$/i.test(v) ? null : 'L’identifiant du compte compte 32 caractères (chiffres et lettres a–f).') },
      { env: 'CLOUDFLARE_API_TOKEN', label: 'Jeton d’API', secret: true, check: common },
    ],
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    free: false,
    note: 'Payant, meilleure qualité d’écriture.',
    help: { url: 'https://console.anthropic.com/settings/keys', label: 'Créer une clé (console Anthropic)' },
    fields: [{ env: 'ANTHROPIC_API_KEY', label: 'Clé API Claude', secret: true, placeholder: 'sk-ant-…', check: withPrefix('sk-ant-', 'Claude') }],
  },
]

export const PROVIDER_IDS = PROVIDERS.map(p => p.id)
export const providerById = (id: string): ProviderInfo | undefined => PROVIDERS.find(p => p.id === id)

/** Clé de stockage dans cms_settings_kv. Les secrets portent le préfixe « secret_ » : jamais exposés ni modifiables par la route générique. */
export const SECRET_KV_PREFIX = 'secret_'
export const kvKeyFor = (f: ProviderField) => (f.secret ? `${SECRET_KV_PREFIX}ai_${f.env.toLowerCase()}` : `ai_${f.env.toLowerCase()}`)
export const PREFERRED_KV_KEY = 'ai_provider_preferred'

/** Valide les valeurs reçues (seules celles fournies et non vides). Une valeur vide est ignorée, jamais enregistrée. */
export function validateProviderValues(
  provider: ProviderInfo,
  values: Record<string, unknown>,
): { ok: true; values: Record<string, string> } | { ok: false; error: string } {
  const out: Record<string, string> = {}
  for (const field of provider.fields) {
    const raw = values[field.env]
    if (raw === undefined || raw === null) continue
    if (typeof raw !== 'string') return { ok: false, error: `${field.label} : texte attendu.` }
    const v = raw.trim()
    if (!v) continue
    const err = field.check(v)
    if (err) return { ok: false, error: `${field.label} : ${err}` }
    out[field.env] = v
  }
  return { ok: true, values: out }
}
