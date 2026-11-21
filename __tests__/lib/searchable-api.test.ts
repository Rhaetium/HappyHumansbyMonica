import { describe, it, expect, vi } from 'vitest'
import { SearchableError, buildOverview, callTool, fetchOverview, parseProjects, parseRpcBody, pickProject } from '@/lib/searchable-api'

// Clés FICTIVES : ne jamais mettre une vraie clé dans un test.
const KEY = 'sea_0123456789abcdef0123456789abcdef'
const project = { id: 'p1', name: 'Happy Humans', domain: 'happyhumans.fr' }

describe('parseRpcBody', () => {
  it('lit du JSON simple', () => {
    expect(parseRpcBody('{"result":{"a":1}}')).toEqual({ result: { a: 1 } })
  })
  it('lit un flux SSE (event: message / data: …)', () => {
    expect(parseRpcBody('event: message\ndata: {"result":{"ok":true}}\n\n')).toEqual({ result: { ok: true } })
  })
  it("renvoie null pour du vide ou de l'illisible", () => {
    expect(parseRpcBody('')).toBeNull()
    expect(parseRpcBody('data: pas du json')).toBeNull()
  })
})

describe('pickProject', () => {
  const list = [{ id: 'a', name: 'A', domain: 'autre.fr' }, project]
  it("préfère l'identifiant demandé, puis le domaine du site, puis le premier", () => {
    expect(pickProject(list, 'a')?.id).toBe('a')
    expect(pickProject(list, undefined, 'https://www.happyhumans.fr/')?.id).toBe('p1')
    expect(pickProject(list)?.id).toBe('a')
    expect(pickProject([])).toBeNull()
  })
  it('un identifiant inconnu retombe sur le domaine', () => {
    expect(pickProject(list, 'zzz', 'happyhumans.fr')?.id).toBe('p1')
  })
})

describe('parseProjects', () => {
  it("ignore les entrées sans identifiant", () => {
    expect(parseProjects({ projects: [{ id: 'x', name: 'X', domain: 'x.fr' }, { name: 'sans id' }] })).toEqual([{ id: 'x', name: 'X', domain: 'x.fr' }])
    expect(parseProjects({})).toEqual([])
  })
})

describe('buildOverview', () => {
  const raw = {
    visibility: {
      summary: { visibilityScore: 9.6, scoreChange: -1.7, scoreChangePeriod: '30d', totalResponses: 1404, totalMentions: 2993, totalCitations: 1957 },
      platforms: [{ platformId: 'chatgpt', responses: 468, visibilityRate: 12 }, { platform: 'google-ai-overview', responses: 468, visibilityRate: 11.1 }],
      trend: [{ date: '2026-11-13', score: 11.3 }, { date: '2026-11-14' }],
    },
    opportunities: {
      summary: { total: 3, byImpact: { high: 2, medium: 1 } },
      opportunities: [
        { id: 'o1', title: 'Medium one', impact: 'medium', source: 'sources', status: 'active' },
        { id: 'o2', title: 'High one', impact: 'high', source: 'sentiment', status: 'active' },
        { id: 'o3', title: 'Done one', impact: 'critical', source: 'x', status: 'completed' },
      ],
    },
    audits: {
      audits: [
        { page: { slug: '/faq' }, scores: { technical: 95, aeo: 75, overall: 85 }, completedAt: '2026-11-19T11:00:00Z' },
        { page: { slug: '/faq' }, scores: { technical: 95, aeo: 83, overall: 89 }, completedAt: '2026-11-19T12:00:00Z' },
        { page: { slug: '/' }, scores: { technical: 95, aeo: 92, overall: 94 }, completedAt: '2026-11-19T12:00:00Z' },
      ],
    },
    topics: { topics: [{ id: 't1', name: 'Fort', visibility: 22.1, rank: 1, promptCount: 26 }, { id: 't2', name: 'Faible', visibility: 0, rank: null, promptCount: 3 }] },
  }
  const o = buildOverview(project, raw, new Date('2026-11-21T10:00:00Z'))

  it('score et plateformes', () => {
    expect(o.score).toEqual({ value: 9.6, change: -1.7, period: '30d', responses: 1404, mentions: 2993, citations: 1957 })
    expect(o.platforms.map(p => p.id)).toEqual(['chatgpt', 'google-ai-overview'])
  })
  it('la tendance ignore les points sans score', () => {
    expect(o.trend).toEqual([{ date: '2026-11-13', score: 11.3 }])
  })
  it("opportunités : actives seulement, les plus importantes d'abord", () => {
    expect(o.opportunities.top.map(t => t.id)).toEqual(['o2', 'o1'])
    expect(o.opportunities.total).toBe(3)
    expect(o.opportunities.byImpact).toEqual({ high: 2, medium: 1 })
  })
  it("audits : le plus récent par page, les pages les moins bien notées d'abord", () => {
    expect(o.audits).toHaveLength(2)
    expect(o.audits[0]).toMatchObject({ slug: '/faq', aeo: 83, overall: 89 })
    expect(o.audits[1].slug).toBe('/')
  })
  it("thèmes : les moins visibles d'abord", () => {
    expect(o.topics.map(t => t.name)).toEqual(['Faible', 'Fort'])
  })
  it('tolère des réponses vides', () => {
    const empty = buildOverview(project, { visibility: {}, opportunities: {}, audits: {}, topics: {} })
    expect(empty.score).toBeNull()
    expect(empty.opportunities).toEqual({ total: 0, byImpact: {}, top: [] })
    expect(empty.audits).toEqual([])
  })
})

function rpcResponse(structuredContent: unknown, extra: Record<string, unknown> = {}) {
  const body = `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { structuredContent, ...extra } })}\n\n`
  return new Response(body, { status: 200 })
}

describe('callTool', () => {
  it('envoie la clé en Bearer et renvoie les données structurées', async () => {
    const f = vi.fn(async () => rpcResponse({ projects: [] }))
    const out = await callTool(KEY, 'list_projects', {}, f as unknown as typeof fetch)
    expect(out).toEqual({ projects: [] })
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`)
    expect(JSON.parse(init.body as string)).toMatchObject({ method: 'tools/call', params: { name: 'list_projects' } })
  })
  it('une clé refusée donne une erreur claire (401)', async () => {
    const f = vi.fn(async () => new Response('no', { status: 401 }))
    await expect(callTool(KEY, 'list_projects', {}, f as unknown as typeof fetch)).rejects.toMatchObject({ status: 401 })
  })
  it("une erreur d'outil devient une SearchableError", async () => {
    const f = vi.fn(async () => rpcResponse({}, { isError: true, content: [{ type: 'text', text: 'Projet introuvable' }] }))
    await expect(callTool(KEY, 'get_visibility', {}, f as unknown as typeof fetch)).rejects.toThrow('Projet introuvable')
  })
  it('un réseau coupé ne fait pas fuiter la clé dans le message', async () => {
    const f = vi.fn(async () => { throw new Error(`boom ${KEY}`) })
    const err = await callTool(KEY, 'x', {}, f as unknown as typeof fetch).catch(e => e)
    expect(err).toBeInstanceOf(SearchableError)
    expect(String(err.message)).not.toContain('sea_')
  })
})

describe('fetchOverview', () => {
  it('lit le projet du domaine puis assemble les quatre lectures', async () => {
    const f = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const { params } = JSON.parse(init!.body as string)
      const data: Record<string, unknown> = {
        list_projects: { projects: [project] },
        get_visibility: { summary: { visibilityScore: 10 } },
        get_opportunities: { summary: { total: 0 }, opportunities: [] },
        get_site_health: { audits: [] },
        get_topic_analysis: { topics: [] },
      }
      return rpcResponse(data[params.name])
    })
    const o = await fetchOverview(KEY, { domainHint: 'https://happyhumans.fr' }, f as unknown as typeof fetch)
    expect(o.project.id).toBe('p1')
    expect(o.score?.value).toBe(10)
    expect(f).toHaveBeenCalledTimes(5)
  })
  it('aucun projet : message clair', async () => {
    const f = vi.fn(async () => rpcResponse({ projects: [] }))
    await expect(fetchOverview(KEY, {}, f as unknown as typeof fetch)).rejects.toThrow('Aucun projet')
  })
})
