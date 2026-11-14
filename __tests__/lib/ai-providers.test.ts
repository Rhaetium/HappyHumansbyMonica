import { describe, it, expect } from 'vitest'
import { PROVIDERS, providerById, validateProviderValues, kvKeyFor, SECRET_KV_PREFIX } from '@/lib/ai-providers'

const gemini = providerById('gemini')!
const groq = providerById('groq')!
const cloudflare = providerById('cloudflare')!

describe('catalogue', () => {
  it('propose les fournisseurs gratuits : Gemini, Groq, Cloudflare', () => {
    expect(PROVIDERS.filter(p => p.free).map(p => p.id).sort()).toEqual(['cloudflare', 'gemini', 'groq'])
    expect(providerById('anthropic')!.free).toBe(false)
  })

  it('un secret se range sous « secret_ai_… » ; un réglage simple, non', () => {
    const [key, model] = gemini.fields
    expect(kvKeyFor(key)).toBe(`${SECRET_KV_PREFIX}ai_gemini_api_key`)
    expect(kvKeyFor(model)).toBe('ai_gemini_model')
  })
})

describe('validateProviderValues', () => {
  it('accepte une clé plausible et la nettoie', () => {
    const r = validateProviderValues(gemini, { GEMINI_API_KEY: '  AIzaSyExampleKey12345678901234567890  ' })
    expect(r).toEqual({ ok: true, values: { GEMINI_API_KEY: 'AIzaSyExampleKey12345678901234567890' } })
  })

  it('refuse un mauvais préfixe, avec une explication', () => {
    const r = validateProviderValues(groq, { GROQ_API_KEY: 'sk-ant-pas-la-bonne-cle' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('gsk_')
  })

  it('refuse une clé avec des espaces ou un retour à la ligne (copier-coller raté)', () => {
    expect(validateProviderValues(groq, { GROQ_API_KEY: 'gsk_abc def12345' }).ok).toBe(false)
    expect(validateProviderValues(groq, { GROQ_API_KEY: 'gsk_abcdef12345\nlignesuivante' }).ok).toBe(false)
  })

  it('ignore une valeur vide : un champ laissé vide reste inchangé', () => {
    expect(validateProviderValues(gemini, { GEMINI_API_KEY: '   ', GEMINI_MODEL: '' })).toEqual({ ok: true, values: {} })
  })

  it('n’accepte que les champs du fournisseur', () => {
    expect(validateProviderValues(groq, { ANTHROPIC_API_KEY: 'sk-ant-xxxxxxxx', GROQ_API_KEY: 'gsk_abcdef12345' })).toEqual({ ok: true, values: { GROQ_API_KEY: 'gsk_abcdef12345' } })
  })

  it('Cloudflare : identifiant de 32 caractères hexadécimaux', () => {
    expect(validateProviderValues(cloudflare, { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'jeton-assez-long-123' }).ok).toBe(true)
    expect(validateProviderValues(cloudflare, { CLOUDFLARE_ACCOUNT_ID: 'trop-court' }).ok).toBe(false)
  })

  it('refuse un nom de modèle invalide et une valeur qui n’est pas du texte', () => {
    expect(validateProviderValues(gemini, { GEMINI_MODEL: 'modèle avec espaces' }).ok).toBe(false)
    expect(validateProviderValues(gemini, { GEMINI_API_KEY: 123 }).ok).toBe(false)
  })
})
