// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { AddressInfo } from 'node:net'
import { CMS_SESSION_COOKIE, getCmsSessionToken } from '@/lib/cms-auth'
// scripts/mock-supabase.cjs est du CJS sans types : require volontaire.
const { createMockSupabase } = require('../../scripts/mock-supabase.cjs')

/**
 * Tests d'intégration du flux brouillon / publication : les VRAIS gestionnaires de routes Next, parlant au
 * VRAI client supabase-js, contre le faux Supabase (scripts/mock-supabase.cjs). Aucune base requise.
 */

const PW = 'test-password-xyz'
let mock: ReturnType<typeof createMockSupabase>
let content: typeof import('@/app/api/cms/content/route')
let publish: typeof import('@/app/api/cms/publish/route')
let publicContent: typeof import('@/app/api/cms/public-content/route')

beforeAll(async () => {
  mock = createMockSupabase()
  await new Promise<void>(res => mock.server.listen(0, '127.0.0.1', () => res()))
  const { port } = mock.server.address() as AddressInfo
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service'
  process.env.CMS_PASSWORD = PW
  content = await import('@/app/api/cms/content/route')
  publish = await import('@/app/api/cms/publish/route')
  publicContent = await import('@/app/api/cms/public-content/route')
})
afterAll(async () => { await new Promise(res => mock.server.close(res)) })
beforeEach(() => {
  mock.reset()
  // contenu publié de départ
  mock.getDb().site_content.push(
    { id: 'a', page: 'coaching', block_key: 'hero_title', value: 'Titre en ligne' },
    { id: 'b', page: 'coaching', block_key: 'hero_badge', value: 'Badge en ligne' },
  )
})

// Authentification par une vraie session signée (comme le navigateur après connexion).
const sessionCookie = () => `${CMS_SESSION_COOKIE}=${getCmsSessionToken()}`
const req = (method: string, path: string, body?: unknown, auth = true) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { cookie: sessionCookie() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const putDraft = (block_key: string, value: string) => content.PUT(req('PUT', '/api/cms/content', { page: 'coaching', block_key, value, draft: true }))
const pub = async (preview = false, auth = true) => {
  const res = await publicContent.GET(req('GET', `/api/cms/public-content?page=coaching${preview ? '&preview=1' : ''}`, undefined, auth))
  const j = await res.json()
  return Object.fromEntries((j.content as { block_key: string; value: string }[]).map(r => [r.block_key, r.value]))
}
const draftRows = () => mock.getDb().site_content.filter((r: { page: string }) => r.page === 'draft:coaching')

describe('brouillon', () => {
  it('un brouillon n’apparaît PAS sur le site public', async () => {
    expect((await putDraft('hero_title', 'Titre brouillon')).status).toBe(200)
    expect((await pub()).hero_title).toBe('Titre en ligne')
  })

  it('l’aperçu authentifié voit le brouillon, par-dessus le publié', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    const preview = await pub(true)
    expect(preview.hero_title).toBe('Titre brouillon')
    expect(preview.hero_badge).toBe('Badge en ligne')
  })

  it('un visiteur non authentifié ne voit jamais le brouillon, même avec ?preview=1', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    expect((await pub(true, false)).hero_title).toBe('Titre en ligne')
  })

  it('n’écrit qu’une ligne : pas de copie des autres champs', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    expect(draftRows()).toHaveLength(1)
  })

  it('refuse l’écriture sans authentification', async () => {
    const res = await content.PUT(req('PUT', '/api/cms/content', { page: 'coaching', block_key: 'hero_title', value: 'pirate', draft: true }, false))
    expect(res.status).toBe(401)
    expect(draftRows()).toHaveLength(0)
  })

  it('reset retire le champ du brouillon', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    await content.PUT(req('PUT', '/api/cms/content', { page: 'coaching', block_key: 'hero_title', draft: true, reset: true }))
    expect(draftRows()).toHaveLength(0)
    expect((await pub(true)).hero_title).toBe('Titre en ligne')
  })

  it('signale draftUnsupported si la base refuse les brouillons (contrainte CHECK)', async () => {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/__config?rejectDrafts=1`)
    const res = await putDraft('hero_title', 'x')
    expect(res.status).toBe(500)
    expect((await res.json()).draftUnsupported).toBe(true)
    // et l'écriture directe continue de fonctionner
    const live = await content.PUT(req('PUT', '/api/cms/content', { page: 'coaching', block_key: 'hero_title', value: 'Direct' }))
    expect(live.status).toBe(200)
    expect((await pub()).hero_title).toBe('Direct')
  })
})

describe('publication', () => {
  it('copie le brouillon vers la page publique puis le supprime', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    await putDraft('hero_new', 'Nouveau champ')
    const res = await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching' }))
    expect(await res.json()).toMatchObject({ success: true, published: 2 })
    const live = await pub()
    expect(live.hero_title).toBe('Titre brouillon')
    expect(live.hero_new).toBe('Nouveau champ')
    expect(live.hero_badge).toBe('Badge en ligne') // champ non modifié : intact
    expect(draftRows()).toHaveLength(0)
  })

  it('peut ne publier que certains champs', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    await putDraft('hero_badge', 'Badge brouillon')
    await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching', keys: ['hero_title'] }))
    const live = await pub()
    expect(live.hero_title).toBe('Titre brouillon')
    expect(live.hero_badge).toBe('Badge en ligne')
    expect(draftRows().map((r: { block_key: string }) => r.block_key)).toEqual(['hero_badge'])
  })

  it('publier sans brouillon ne change rien', async () => {
    const res = await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching' }))
    expect(await res.json()).toMatchObject({ success: true, published: 0 })
    expect((await pub()).hero_title).toBe('Titre en ligne')
  })

  it('exige l’authentification', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    expect((await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching' }, false))).status).toBe(401)
    expect((await pub()).hero_title).toBe('Titre en ligne')
  })

  it('refuse une page « draft: » et une action inconnue', async () => {
    expect((await publish.POST(req('POST', '/api/cms/publish', { page: 'draft:coaching' }))).status).toBe(400)
    expect((await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching', action: 'supprimer-tout' }))).status).toBe(400)
  })

  it('l’abandon supprime le brouillon sans toucher au publié', async () => {
    await putDraft('hero_title', 'Titre brouillon')
    const res = await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching', action: 'discard' }))
    expect(await res.json()).toMatchObject({ success: true, discarded: 1 })
    expect(draftRows()).toHaveLength(0)
    expect((await pub()).hero_title).toBe('Titre en ligne')
  })
})

describe('écriture directe en ligne (édition historique)', () => {
  it('remplace un brouillon du même champ (sinon « Publier » écraserait la modification plus récente)', async () => {
    await putDraft('hero_title', 'Brouillon ancien')
    await content.PUT(req('PUT', '/api/cms/content', { page: 'coaching', block_key: 'hero_title', value: 'En ligne direct' }))
    expect((await pub()).hero_title).toBe('En ligne direct')
    expect(draftRows()).toHaveLength(0)
    await publish.POST(req('POST', '/api/cms/publish', { page: 'coaching' }))
    expect((await pub()).hero_title).toBe('En ligne direct')
  })
})
