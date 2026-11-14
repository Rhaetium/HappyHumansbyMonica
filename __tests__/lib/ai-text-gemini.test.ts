import { describe, it, expect, vi, afterEach } from 'vitest'
import { pickProvider, generateText, geminiText, AI_MODELS } from '@/lib/ai-text'

const G = { GEMINI_API_KEY: 'AIza-test-key-123456' }

describe('pickProvider avec Gemini', () => {
  it('Gemini est le dernier de l’ordre par défaut : l’existant ne change pas', () => {
    expect(pickProvider(G)).toBe('gemini')
    expect(pickProvider({ ...G, GROQ_API_KEY: 'g' })).toBe('groq')
    expect(pickProvider({ ...G, ANTHROPIC_API_KEY: 'a' })).toBe('anthropic')
  })

  it('AI_PROVIDER désigne le fournisseur préféré', () => {
    expect(pickProvider({ ...G, GROQ_API_KEY: 'g', AI_PROVIDER: 'gemini' })).toBe('gemini')
  })

  it('un fournisseur préféré non configuré est ignoré : on retombe sur l’ordre par défaut', () => {
    expect(pickProvider({ GROQ_API_KEY: 'g', AI_PROVIDER: 'gemini' })).toBe('groq')
    expect(pickProvider({ GROQ_API_KEY: 'g', AI_PROVIDER: 'nimporte-quoi' })).toBe('groq')
    expect(pickProvider({ AI_PROVIDER: 'gemini' })).toBeNull()
  })
})

describe('geminiText', () => {
  it('assemble les morceaux de la première réponse', () => {
    expect(geminiText({ candidates: [{ content: { parts: [{ text: 'Bon' }, { text: 'jour' }] } }] })).toBe('Bonjour')
  })

  it('ignore le raisonnement interne du modèle', () => {
    expect(geminiText({ candidates: [{ content: { parts: [{ text: 'je réfléchis', thought: true }, { text: 'réponse' }] } }] })).toBe('réponse')
  })

  it('réponse vide ou inattendue → texte vide, sans exception', () => {
    for (const d of [null, {}, { candidates: [] }, { candidates: [{}] }]) expect(geminiText(d)).toBe('')
  })
})

describe('generateText via Gemini', () => {
  afterEach(() => vi.unstubAllGlobals())
  const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })

  it('bonne URL, clé en en-tête (jamais dans l’adresse), consigne et marge de raisonnement', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok('salut'))
    vi.stubGlobal('fetch', fetchMock)
    const res = await generateText({ system: 'sys', prompt: 'pr', maxTokens: 300 }, G)
    expect(res).toEqual({ text: 'salut', provider: 'gemini' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent`)
    expect(url).not.toContain(G.GEMINI_API_KEY)
    expect(init.headers['x-goog-api-key']).toBe(G.GEMINI_API_KEY)
    const body = JSON.parse(init.body)
    expect(body.systemInstruction.parts[0].text).toBe('sys')
    expect(body.contents[0].parts[0].text).toBe('pr')
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(300)
  })

  it('GEMINI_MODEL remplace le modèle par défaut', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok('x'))
    vi.stubGlobal('fetch', fetchMock)
    await generateText({ system: 's', prompt: 'p', maxTokens: 10 }, { ...G, GEMINI_MODEL: 'gemini-futur-1' })
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-futur-1:generateContent')
  })

  it('quota atteint : erreur 429 lisible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
    await expect(generateText({ system: 's', prompt: 'p', maxTokens: 10 }, G)).rejects.toMatchObject({ status: 429, message: expect.stringContaining('Gemini') })
  })

  it('clé refusée : message utile, sans détail technique ni clé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })))
    const err = await generateText({ system: 's', prompt: 'p', maxTokens: 10 }, G).catch(e => e)
    expect(err.status).toBe(502)
    expect(err.message).toContain('Vérifiez la clé')
    expect(err.message).not.toContain(G.GEMINI_API_KEY)
  })

  it('réponse vide : erreur explicite', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok('   ')))
    await expect(generateText({ system: 's', prompt: 'p', maxTokens: 10 }, G)).rejects.toMatchObject({ status: 502 })
  })
})
