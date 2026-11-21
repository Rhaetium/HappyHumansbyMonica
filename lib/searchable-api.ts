// Searchable (suivi de la visibilité dans les réponses des IA) : lecture des chiffres pour l'onglet « Visibilité » du CMS.
//
// Searchable expose ses données par un serveur MCP en HTTP (JSON-RPC). La clé d'API reste sur le serveur :
// l'interface du CMS ne parle qu'à /api/cms/searchable/*, jamais à Searchable directement.
// Les fonctions « parse… » et « build… » sont pures et testées ; le reste appelle le réseau.

export const SEARCHABLE_APP_URL = 'https://app.searchable.com/'
const DEFAULT_ENDPOINT = 'https://app.searchable.com/api/mcp-server/mcp'

export class SearchableError extends Error {
  constructor(message: string, readonly hint?: string, readonly status = 502) {
    super(message)
  }
}

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Corps de réponse : soit du JSON, soit des évènements « data: {...} » (SSE). Renvoie le dernier message JSON-RPC. */
export function parseRpcBody(text: string): Json | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const candidates = trimmed.startsWith('{')
    ? [trimmed]
    : trimmed.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim())
  for (const c of candidates.reverse()) {
    try {
      const v = JSON.parse(c)
      if (v && typeof v === 'object') return v as Json
    } catch { /* ligne suivante */ }
  }
  return null
}

async function rpc(key: string, method: string, params: Json, fetchImpl: typeof fetch): Promise<Json> {
  const endpoint = process.env.SEARCHABLE_MCP_URL?.trim() || DEFAULT_ENDPOINT
  let res: Response
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
  } catch {
    throw new SearchableError('Searchable ne répond pas.', 'Réessayez dans quelques minutes.')
  }
  if (res.status === 401 || res.status === 403) {
    throw new SearchableError('Searchable refuse cette clé.', 'Vérifiez la clé dans Searchable (Paramètres → Intégrations → clés d’API), avec le droit de lecture.', 401)
  }
  if (!res.ok) throw new SearchableError(`Searchable a répondu une erreur (${res.status}).`, 'Réessayez dans quelques minutes.')
  const body = parseRpcBody(await res.text())
  if (!body) throw new SearchableError('Réponse de Searchable illisible.')
  const error = obj(body.error)
  if (Object.keys(error).length) throw new SearchableError(str(error.message) || 'Searchable a refusé la demande.')
  return obj(body.result)
}

/** Appelle un outil de Searchable et renvoie ses données structurées. */
export async function callTool(key: string, name: string, args: Json = {}, fetchImpl: typeof fetch = fetch): Promise<Json> {
  const result = await rpc(key, 'tools/call', { name, arguments: args }, fetchImpl)
  if (result.isError) {
    const text = arr(result.content).map(c => str(obj(c).text)).join(' ').trim()
    throw new SearchableError(text || 'Searchable a refusé la demande.')
  }
  return obj(result.structuredContent)
}

export type SearchableProject = { id: string; name: string; domain: string }

export type SearchableOverview = {
  project: SearchableProject
  appUrl: string
  score: { value: number; change: number | null; period: string; responses: number; mentions: number; citations: number } | null
  platforms: { id: string; visibilityRate: number; responses: number }[]
  trend: { date: string; score: number }[]
  opportunities: { total: number; byImpact: Record<string, number>; top: { id: string; title: string; impact: string; source: string }[] }
  audits: { slug: string; technical: number | null; aeo: number | null; overall: number | null; completedAt: string | null }[]
  topics: { id: string; name: string; visibility: number; rank: number | null; promptCount: number }[]
  fetchedAt: string
}

const IMPACT_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/** Choisit le projet : celui demandé, sinon celui du domaine du site, sinon le premier. */
export function pickProject(projects: SearchableProject[], wantedId?: string, domainHint?: string): SearchableProject | null {
  if (!projects.length) return null
  if (wantedId) {
    const byId = projects.find(p => p.id === wantedId)
    if (byId) return byId
  }
  const host = (domainHint ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
  if (host) {
    const byDomain = projects.find(p => p.domain.replace(/^www\./, '').toLowerCase() === host)
    if (byDomain) return byDomain
  }
  return projects[0]
}

export function parseProjects(structured: Json): SearchableProject[] {
  return arr(structured.projects)
    .map(p => obj(p))
    .filter(p => str(p.id))
    .map(p => ({ id: str(p.id), name: str(p.name), domain: str(p.domain) }))
}

/** Assemble l'aperçu à partir des quatre réponses de Searchable. Tolérant : un champ absent donne une valeur vide, jamais une erreur. */
export function buildOverview(
  project: SearchableProject,
  raw: { visibility: Json; opportunities: Json; audits: Json; topics: Json },
  now: Date = new Date(),
): SearchableOverview {
  const s = obj(raw.visibility.summary)
  const value = num(s.visibilityScore)
  const score = value === null ? null : {
    value,
    change: num(s.scoreChange),
    period: str(s.scoreChangePeriod) || '30d',
    responses: num(s.totalResponses) ?? 0,
    mentions: num(s.totalMentions) ?? 0,
    citations: num(s.totalCitations) ?? 0,
  }

  const platforms = arr(raw.visibility.platforms).map(p => obj(p)).map(p => ({
    id: str(p.platformId) || str(p.platform),
    visibilityRate: num(p.visibilityRate) ?? 0,
    responses: num(p.responses) ?? 0,
  })).filter(p => p.id)

  const trend = arr(raw.visibility.trend).map(t => obj(t))
    .map(t => ({ date: str(t.date), score: num(t.score) }))
    .filter((t): t is { date: string; score: number } => !!t.date && t.score !== null)

  const opps = arr(raw.opportunities.opportunities).map(o => obj(o)).filter(o => str(o.status) === 'active' || !str(o.status))
  const top = opps
    .map(o => ({ id: str(o.id), title: str(o.title), impact: str(o.impact), source: str(o.source) }))
    .filter(o => o.id && o.title)
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9))
    .slice(0, 6)
  const summary = obj(raw.opportunities.summary)
  const byImpact: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj(summary.byImpact))) { const n = num(v); if (n !== null) byImpact[k] = n }

  // Un audit par page : le plus récent
  const latest = new Map<string, SearchableOverview['audits'][number]>()
  for (const a of arr(raw.audits.audits).map(x => obj(x))) {
    const slug = str(obj(a.page).slug)
    if (!slug) continue
    const sc = obj(a.scores)
    const entry = { slug, technical: num(sc.technical), aeo: num(sc.aeo), overall: num(sc.overall), completedAt: str(a.completedAt) || null }
    const prev = latest.get(slug)
    if (!prev || (entry.completedAt ?? '') > (prev.completedAt ?? '')) latest.set(slug, entry)
  }
  const audits = [...latest.values()].sort((a, b) => (a.overall ?? 101) - (b.overall ?? 101))

  const topics = arr(raw.topics.topics).map(t => obj(t)).map(t => ({
    id: str(t.id), name: str(t.name), visibility: num(t.visibility) ?? 0, rank: num(t.rank), promptCount: num(t.promptCount) ?? 0,
  })).filter(t => t.id && t.name).sort((a, b) => a.visibility - b.visibility)

  return {
    project,
    appUrl: SEARCHABLE_APP_URL,
    score,
    platforms,
    trend,
    opportunities: { total: num(summary.total) ?? opps.length, byImpact, top },
    audits,
    topics,
    fetchedAt: now.toISOString(),
  }
}

/** Récupère l'aperçu complet. Les quatre lectures partent en parallèle (lecture seule : rien n'est modifié chez Searchable). */
export async function fetchOverview(
  key: string,
  opts: { projectId?: string; domainHint?: string } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SearchableOverview> {
  const projects = parseProjects(await callTool(key, 'list_projects', {}, fetchImpl))
  const project = pickProject(projects, opts.projectId, opts.domainHint)
  if (!project) throw new SearchableError('Aucun projet dans ce compte Searchable.', 'Créez ou rattachez le site dans Searchable, puis actualisez.')
  const args = { projectId: project.id }
  const [visibility, opportunities, audits, topics] = await Promise.all([
    callTool(key, 'get_visibility', args, fetchImpl),
    callTool(key, 'get_opportunities', { ...args, status: 'active', limit: 50 }, fetchImpl),
    callTool(key, 'get_site_health', { ...args, view: 'audits' }, fetchImpl),
    callTool(key, 'get_topic_analysis', args, fetchImpl),
  ])
  return buildOverview(project, { visibility, opportunities, audits, topics })
}
