// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { AddressInfo } from 'node:net'
import { CMS_SESSION_COOKIE, getCmsSessionToken } from '@/lib/cms-auth'
// scripts/mock-supabase.cjs est du CJS sans types : require volontaire.
const { createMockSupabase } = require('../../scripts/mock-supabase.cjs')

/**
 * Clés d'IA saisies dans l'admin : les VRAIS gestionnaires de routes contre le faux Supabase.
 * Garanties vérifiées : jamais de clé renvoyée au navigateur, jamais de clé en clair en base,
 * Vercel prioritaire, routes réservées à l'admin.
 */

const KEY = 'AIzaSyClefTresSecreteEnClair1234567890'
const AI_ENV = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GROQ_API_KEY', 'ANTHROPIC_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'AI_PROVIDER']
let mock: ReturnType<typeof createMockSupabase>
let keysRoute: typeof import('@/app/api/cms/ai-keys/route')
let testRoute: typeof import('@/app/api/cms/ai-keys/test/route')
let settingsRoute: typeof import('@/app/api/cms/settings/route')
let aiKeys: typeof import('@/lib/ai-keys')
const saved: Record<string, string | undefined> = {}

beforeAll(async () => {
  mock = createMockSupabase()
  await new Promise<void>(res => mock.server.listen(0, '127.0.0.1', () => res()))
  const { port } = mock.server.address() as AddressInfo
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service'
  process.env.CMS_PASSWORD = 'test-password-xyz'
  process.env.CMS_SESSION_SECRET = 'secret-de-session-pour-les-tests-12345'
  keysRoute = await import('@/app/api/cms/ai-keys/route')
  testRoute = await import('@/app/api/cms/ai-keys/test/route')
  settingsRoute = await import('@/app/api/cms/settings/route')
  aiKeys = await import('@/lib/ai-keys')
})
afterAll(async () => { await new Promise(res => mock.server.close(res)) })
beforeEach(() => {
  mock.reset()
  for (const k of AI_ENV) { saved[k] = process.env[k]; delete process.env[k] }
})
afterEach(() => {
  vi.unstubAllGlobals()
  for (const k of AI_ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
  process.env.CMS_SESSION_SECRET = 'secret-de-session-pour-les-tests-12345'
})

const cookie = () => `${CMS_SESSION_COOKIE}=${getCmsSessionToken()}`
const req = (method: string, path: string, body?: unknown, auth = true) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { cookie: cookie() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const kvRows = () => mock.getDb().cms_settings_kv as { key: string; value: string }[]
const saveGemini = (key = KEY) => keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { provider: 'gemini', values: { GEMINI_API_KEY: key } }))

describe('accès réservé à l’admin', () => {
  it('toutes les routes refusent sans session', async () => {
    expect((await keysRoute.GET(req('GET', '/api/cms/ai-keys', undefined, false))).status).toBe(401)
    expect((await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { provider: 'gemini', values: { GEMINI_API_KEY: KEY } }, false))).status).toBe(401)
    expect((await keysRoute.DELETE(req('DELETE', '/api/cms/ai-keys?provider=gemini', undefined, false))).status).toBe(401)
    expect((await testRoute.POST(req('POST', '/api/cms/ai-keys/test', { provider: 'gemini' }, false))).status).toBe(401)
    expect(kvRows()).toHaveLength(0)
  })
})

describe('enregistrer une clé', () => {
  it('la clé est chiffrée en base et jamais renvoyée au navigateur', async () => {
    const res = await saveGemini()
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).not.toContain(KEY)

    const row = kvRows().find(r => r.key === 'secret_ai_gemini_api_key')!
    expect(row).toBeDefined()
    expect(row.value).not.toContain(KEY)
    expect(row.value.startsWith('v1.')).toBe(true)

    const status = await (await keysRoute.GET(req('GET', '/api/cms/ai-keys'))).json()
    expect(JSON.stringify(status)).not.toContain(KEY)
    expect(JSON.stringify(status)).not.toContain(row.value)
    expect(status.providers.find((p: { id: string }) => p.id === 'gemini')).toMatchObject({ configured: true, source: 'cms' })
  })

  it('les outils de l’admin retrouvent la clé en clair côté serveur', async () => {
    await saveGemini()
    const env = await aiKeys.loadAiEnv()
    expect(env.GEMINI_API_KEY).toBe(KEY)
  })

  it('une clé mal formée est refusée et rien n’est écrit', async () => {
    const res = await saveGemini('pas-une-cle-gemini')
    expect(res.status).toBe(422)
    expect((await res.json()).error).toContain('AIza')
    expect(kvRows()).toHaveLength(0)
  })

  it('un envoi vide est refusé (rien à enregistrer)', async () => {
    const res = await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { provider: 'gemini', values: { GEMINI_API_KEY: '  ' } }))
    expect(res.status).toBe(422)
  })

  it('fournisseur inconnu : 400', async () => {
    expect((await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { provider: 'inconnu', values: {} }))).status).toBe(400)
  })

  it('sans secret de chiffrement, refuse d’enregistrer : jamais de clé en clair', async () => {
    const pw = process.env.CMS_PASSWORD
    delete process.env.CMS_SESSION_SECRET
    delete process.env.CMS_PASSWORD
    try {
      await expect(aiKeys.saveProviderValues('gemini', { GEMINI_API_KEY: KEY })).rejects.toMatchObject({ status: 503 })
      expect(kvRows()).toHaveLength(0)
    } finally {
      process.env.CMS_PASSWORD = pw
    }
  })
})

describe('Vercel prioritaire, retrait, fournisseur préféré', () => {
  it('une clé de Vercel est signalée comme telle et l’emporte sur celle du CMS', async () => {
    await saveGemini()
    process.env.GEMINI_API_KEY = 'AIza-valeur-de-vercel-1234567890'
    const status = await (await keysRoute.GET(req('GET', '/api/cms/ai-keys'))).json()
    expect(status.providers.find((p: { id: string }) => p.id === 'gemini').source).toBe('vercel')
    expect((await aiKeys.loadAiEnv()).GEMINI_API_KEY).toBe('AIza-valeur-de-vercel-1234567890')
  })

  it('retirer supprime les valeurs du CMS', async () => {
    await saveGemini()
    const res = await keysRoute.DELETE(req('DELETE', '/api/cms/ai-keys?provider=gemini'))
    expect(res.status).toBe(200)
    expect(kvRows().filter(r => r.key.startsWith('secret_ai_'))).toHaveLength(0)
    const status = await res.json()
    expect(status.providers.find((p: { id: string }) => p.id === 'gemini').configured).toBe(false)
  })

  it('choisir le fournisseur préféré, ou revenir à l’automatique', async () => {
    let res = await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { preferred: 'groq' }))
    expect((await res.json()).preferred).toBe('groq')
    res = await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { preferred: '' }))
    expect((await res.json()).preferred).toBe('')
    expect((await keysRoute.PUT(req('PUT', '/api/cms/ai-keys', { preferred: 'inconnu' }))).status).toBe(400)
  })

  it('une clé devenue illisible (secret changé) est signalée, sans planter', async () => {
    await saveGemini()
    process.env.CMS_SESSION_SECRET = 'un-tout-autre-secret-12345678901234'
    const status = await (await keysRoute.GET(req('GET', '/api/cms/ai-keys'))).json()
    const g = status.providers.find((p: { id: string }) => p.id === 'gemini')
    expect(g.configured).toBe(false)
    expect(g.fields[0].unreadable).toBe(true)
  })
})

describe('route générique des réglages', () => {
  it('refuse d’écrire un réglage secret_… (ne passe que par la route dédiée)', async () => {
    const res = await settingsRoute.PUT(req('PUT', '/api/cms/settings', { key: 'secret_ai_gemini_api_key', value: KEY }))
    expect(res.status).toBe(403)
    expect(kvRows()).toHaveLength(0)
  })

  it('ne renvoie jamais une clé stockée dans la liste des réglages', async () => {
    await saveGemini()
    const body = await (await settingsRoute.GET(req('GET', '/api/cms/settings'))).text()
    expect(body).not.toContain(KEY)
    expect(body).not.toContain('secret_ai_gemini')
  })

  it('les réglages ordinaires continuent de s’enregistrer', async () => {
    const res = await settingsRoute.PUT(req('PUT', '/api/cms/settings', { key: 'site_name', value: 'Happy Humans' }))
    expect(res.status).toBe(200)
    expect(kvRows().find(r => r.key === 'site_name')?.value).toBe('Happy Humans')
  })
})

describe('bouton « Tester »', () => {
  // Les appels vers le faux Supabase passent ; ceux vers Google sont simulés.
  const stubGoogle = (response: Response) => {
    const real = globalThis.fetch
    const google = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', (url: string | URL | Request, init?: RequestInit) =>
      String(url).includes('googleapis.com') ? google(url, init) : real(url as string, init))
    return google
  }

  it('réussit avec une clé valide et utilise bien la clé enregistrée', async () => {
    await saveGemini()
    const google = stubGoogle(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }))
    const res = await testRoute.POST(req('POST', '/api/cms/ai-keys/test', { provider: 'gemini' }))
    expect(await res.json()).toEqual({ ok: true })
    expect(google.mock.calls[0][1].headers['x-goog-api-key']).toBe(KEY)
  })

  it('un fournisseur non configuré est refusé, sans appel réseau', async () => {
    const google = stubGoogle(new Response('{}', { status: 200 }))
    const res = await testRoute.POST(req('POST', '/api/cms/ai-keys/test', { provider: 'gemini' }))
    expect(res.status).toBe(400)
    expect(google).not.toHaveBeenCalled()
  })

  it('le test n’utilise jamais un autre fournisseur que celui demandé', async () => {
    await saveGemini()
    process.env.GROQ_API_KEY = 'gsk_une_cle_groq_1234567'
    process.env.AI_PROVIDER = 'groq'
    const google = stubGoogle(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }))
    await testRoute.POST(req('POST', '/api/cms/ai-keys/test', { provider: 'gemini' }))
    expect(google).toHaveBeenCalledTimes(1)
  })

  it('une clé refusée par Google donne un message clair, sans la clé', async () => {
    await saveGemini()
    stubGoogle(new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 }))
    const out = await (await testRoute.POST(req('POST', '/api/cms/ai-keys/test', { provider: 'gemini' }))).json()
    expect(out.ok).toBe(false)
    expect(out.error).toContain('Gemini')
    expect(JSON.stringify(out)).not.toContain(KEY)
  })
})
