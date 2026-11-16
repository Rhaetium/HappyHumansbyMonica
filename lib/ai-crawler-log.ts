/**
 * Suivi des robots IA (GPTBot, ClaudeBot, PerplexityBot…) sans « Log Drain » Vercel (réservé aux plans Pro).
 *
 * Le site envoie lui-même, à Searchable Analytics, une ligne de journal NDJSON au format Vercel
 * UNIQUEMENT quand le visiteur est un robot IA reconnu. Aucun visiteur humain n'est transmis (RGPD).
 *
 * Actif seulement si la variable d'environnement SEARCHABLE_LOGS_TOKEN est définie (jeton « sa_… »).
 * Variable facultative : SEARCHABLE_LOGS_URL (adresse d'envoi, valeur par défaut ci-dessous).
 * Le jeton ne doit JAMAIS être écrit dans le code : uniquement dans Vercel → Settings → Environment Variables.
 */

const DEFAULT_ENDPOINT = 'https://tracker.searchableanalytics.com/v1/vercel-logs'

// Robots d'IA : moteurs de réponse et collecte d'entraînement.
const AI_BOT_PATTERN = new RegExp(
  [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'Claude-Web',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Google-CloudVertexBot', 'GoogleOther',
    'Applebot-Extended', 'Bytespider', 'CCBot', 'Amazonbot',
    'cohere-ai', 'Meta-ExternalAgent', 'meta-externalagent', 'FacebookBot',
    'DuckAssistBot', 'MistralAI-User', 'YouBot', 'Diffbot', 'ImagesiftBot',
  ].join('|'),
  'i',
)

export function isAiCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && AI_BOT_PATTERN.test(userAgent)
}

type Req = {
  method: string
  headers: { get(name: string): string | null }
  nextUrl: { pathname: string; search: string; host: string; protocol: string }
}

/** Une ligne de journal au format du Log Drain Vercel (champs utiles à l'analyse des robots). */
export function buildLogLine(req: Req, now = Date.now()) {
  const userAgent = req.headers.get('user-agent') ?? ''
  const path = `${req.nextUrl.pathname}${req.nextUrl.search}`
  const host = req.headers.get('host') ?? req.nextUrl.host
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return {
    id: `hh-${now}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: now,
    source: 'edge',
    host,
    path,
    message: '',
    proxy: {
      timestamp: now,
      method: req.method,
      scheme: req.nextUrl.protocol.replace(':', '') || 'https',
      host,
      path,
      userAgent: [userAgent],
      referer: req.headers.get('referer') ?? '',
      statusCode: 200, // inconnu à ce stade (le proxy s'exécute avant la réponse)
      clientIp: ip,
      region: process.env.VERCEL_REGION ?? '',
    },
  }
}

/** Envoie la ligne. Ne lève jamais d'erreur : un échec de suivi ne doit pas toucher le site. */
export async function sendCrawlerLog(req: Req): Promise<void> {
  const token = process.env.SEARCHABLE_LOGS_TOKEN?.trim()
  if (!token) return
  if (!isAiCrawler(req.headers.get('user-agent'))) return
  try {
    await fetch(process.env.SEARCHABLE_LOGS_URL?.trim() || DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson', Authorization: `Bearer ${token}` },
      body: `${JSON.stringify(buildLogLine(req))}\n`,
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    /* suivi indisponible : on l'ignore */
  }
}
