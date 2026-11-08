import { describe, it, expect, vi, afterEach } from 'vitest'
import { pickProvider, cloudflareText, generateText, AiError, AI_MODELS } from '@/lib/ai-text'

const CF = { CLOUDFLARE_ACCOUNT_ID: 'acc123', CLOUDFLARE_API_TOKEN: 'tok' }

describe('pickProvider', () => {
  it('aucune variable → null', () => {
    expect(pickProvider({})).toBeNull()
  })

  it('ordre de priorité : Anthropic, puis Cloudflare, puis Groq', () => {
    expect(pickProvider({ ...CF, GROQ_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' })).toBe('anthropic')
    expect(pickProvider({ ...CF, GROQ_API_KEY: 'g' })).toBe('cloudflare')
    expect(pickProvider({ GROQ_API_KEY: 'g' })).toBe('groq')
  })

  it('Cloudflare demande les deux variables, et une valeur vide ne compte pas', () => {
    expect(pickProvider({ CLOUDFLARE_API_TOKEN: 'tok' })).toBeNull()
    expect(pickProvider({ ...CF, CLOUDFLARE_ACCOUNT_ID: '  ' })).toBeNull()
    expect(pickProvider({ ANTHROPIC_API_KEY: ' ', GROQ_API_KEY: 'g' })).toBe('groq')
  })
})

describe('cloudflareText', () => {
  it('lit result.response, chaîne ou objet', () => {
    expect(cloudflareText({ result: { response: 'bonjour' } })).toBe('bonjour')
    expect(cloudflareText({ result: { response: { a: 1 } } })).toBe('{"a":1}')
    expect(cloudflareText(null)).toBe('')
    expect(cloudflareText({ result: {} })).toBe('')
  })
})

describe('generateText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sans fournisseur : erreur 503 explicite', async () => {
    await expect(generateText({ system: 's', prompt: 'p', maxTokens: 100 }, {})).rejects.toMatchObject({ status: 503 })
  })

  it('Cloudflare : bonne URL, jeton et messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { response: 'ok' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await generateText({ system: 'sys', prompt: 'pr', maxTokens: 300 }, CF)
    expect(res).toEqual({ text: 'ok', provider: 'cloudflare' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/${AI_MODELS.cloudflare}`)
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'pr' }],
      max_tokens: 300,
    })
  })

  it('Cloudflare : quota dépassé → 429 lisible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
    const err = await generateText({ system: 's', prompt: 'p', maxTokens: 10 }, CF).catch(e => e)
    expect(err).toBeInstanceOf(AiError)
    expect(err.status).toBe(429)
  })

  it('réponse vide → 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { response: '  ' } }), { status: 200 })))
    await expect(generateText({ system: 's', prompt: 'p', maxTokens: 10 }, CF)).rejects.toMatchObject({ status: 502 })
  })

  it('Groq : lit choices[0].message.content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'salut' } }] }), { status: 200 })))
    await expect(generateText({ system: 's', prompt: 'p', maxTokens: 10 }, { GROQ_API_KEY: 'g' })).resolves.toEqual({ text: 'salut', provider: 'groq' })
  })
})
