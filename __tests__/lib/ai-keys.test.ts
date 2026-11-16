import { describe, it, expect } from 'vitest'
import { buildAiEnv, aiKeysStatus } from '@/lib/ai-keys'
import { encryptSecret } from '@/lib/secret-box'

const SECRET = 'secret-de-session-pour-les-tests-12345'
const KEY = 'AIzaSyClefGeminiEnClair1234567890abc'
const stored = (plain: string) => encryptSecret(plain, SECRET)
const baseEnv = { CMS_SESSION_SECRET: SECRET }

describe('buildAiEnv', () => {
  it('lit une clé enregistrée dans le CMS (déchiffrée)', () => {
    const env = buildAiEnv({ secret_ai_gemini_api_key: stored(KEY) }, baseEnv)
    expect(env.GEMINI_API_KEY).toBe(KEY)
  })

  it('une valeur de Vercel l’emporte sur celle du CMS', () => {
    const env = buildAiEnv({ secret_ai_groq_api_key: stored('gsk_depuis_le_cms') }, { ...baseEnv, GROQ_API_KEY: 'gsk_depuis_vercel' })
    expect(env.GROQ_API_KEY).toBe('gsk_depuis_vercel')
  })

  it('une clé illisible (secret changé) est ignorée, sans erreur', () => {
    const env = buildAiEnv({ secret_ai_gemini_api_key: stored(KEY) }, { CMS_SESSION_SECRET: 'un-tout-autre-secret-123456789012' })
    expect(env.GEMINI_API_KEY).toBeUndefined()
  })

  it('sans secret de chiffrement, rien n’est lu en base (jamais de texte brut pris pour une clé)', () => {
    expect(buildAiEnv({ secret_ai_gemini_api_key: 'AIza-en-clair-1234567890' }, {}).GEMINI_API_KEY).toBeUndefined()
  })

  it('transmet le modèle et le fournisseur préféré, depuis le CMS ou Vercel', () => {
    expect(buildAiEnv({ ai_gemini_model: 'gemini-x', ai_provider_preferred: 'groq' }, baseEnv)).toMatchObject({ GEMINI_MODEL: 'gemini-x', AI_PROVIDER: 'groq' })
    expect(buildAiEnv({ ai_provider_preferred: 'groq' }, { ...baseEnv, AI_PROVIDER: 'gemini' }).AI_PROVIDER).toBe('gemini')
  })
})

describe('aiKeysStatus', () => {
  it('ne contient JAMAIS la valeur ni le texte chiffré d’un secret', () => {
    const blob = stored(KEY)
    const out = JSON.stringify(aiKeysStatus({ secret_ai_gemini_api_key: blob }, { ...baseEnv, GROQ_API_KEY: 'gsk_clef_vercel_secrete' }))
    expect(out).not.toContain(KEY)
    expect(out).not.toContain(blob)
    expect(out).not.toContain('gsk_clef_vercel_secrete')
  })

  it('indique la source : Vercel, CMS ou aucune', () => {
    const { providers } = aiKeysStatus({ secret_ai_gemini_api_key: stored(KEY) }, { ...baseEnv, GROQ_API_KEY: 'gsk_x1234567' })
    const by = Object.fromEntries(providers.map(p => [p.id, p]))
    expect(by.gemini).toMatchObject({ configured: true, source: 'cms' })
    expect(by.groq).toMatchObject({ configured: true, source: 'vercel' })
    expect(by.anthropic).toMatchObject({ configured: false, source: null })
  })

  it('Cloudflare demande ses deux valeurs : une seule ne suffit pas', () => {
    const { providers } = aiKeysStatus({ secret_ai_cloudflare_api_token: stored('jeton-assez-long-123') }, baseEnv)
    expect(providers.find(p => p.id === 'cloudflare')!.configured).toBe(false)
  })

  it('signale une clé illisible au lieu de la dire configurée', () => {
    const { providers } = aiKeysStatus({ secret_ai_gemini_api_key: stored(KEY) }, { CMS_SESSION_SECRET: 'un-tout-autre-secret-123456789012' })
    const g = providers.find(p => p.id === 'gemini')!
    expect(g.configured).toBe(false)
    expect(g.fields[0].unreadable).toBe(true)
  })

  it('affiche la valeur d’un réglage simple (modèle) mais jamais celle d’un secret', () => {
    const { providers } = aiKeysStatus({ ai_gemini_model: 'gemini-2.5-flash' }, baseEnv)
    const [key, model] = providers.find(p => p.id === 'gemini')!.fields
    expect(model.value).toBe('gemini-2.5-flash')
    expect(key).not.toHaveProperty('value')
  })

  it('canStore : faux sans secret de chiffrement, et le préféré inconnu est ignoré', () => {
    expect(aiKeysStatus({}, {}).canStore).toBe(false)
    expect(aiKeysStatus({ ai_provider_preferred: 'inconnu' }, baseEnv).preferred).toBe('')
  })
})
