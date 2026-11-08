// Génération de texte par IA pour les outils de l'admin (questionnaires, blog, carrousels).
//
// Un seul point d'entrée, plusieurs fournisseurs, choisis selon les variables présentes dans Vercel :
//   1. Claude (Anthropic)        — ANTHROPIC_API_KEY                         (payant, meilleure qualité)
//   2. Cloudflare Workers AI     — CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (offre gratuite quotidienne)
//   3. Groq                      — GROQ_API_KEY                              (offre gratuite)
// Le premier fournisseur configuré est utilisé. Aucun n'est configuré → AiError 503.
// Le SDK Anthropic (lourd) n'est chargé que s'il sert : voir viaAnthropic.
import type Anthropic from '@anthropic-ai/sdk'

export type AiProvider = 'anthropic' | 'cloudflare' | 'groq'

export type AiTextRequest = {
  system: string
  prompt: string
  /** Longueur maximale de la réponse visible. */
  maxTokens: number
}

export type AiTextResult = { text: string; provider: AiProvider }

export const AI_MODELS = {
  anthropic: 'claude-opus-5-5',
  cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  groq: 'llama-3.3-70b-versatile',
} as const

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

type Env = Record<string, string | undefined>

/** Fournisseur à utiliser d'après les variables d'environnement (null si aucun). */
export function pickProvider(env: Env = process.env): AiProvider | null {
  if (env.ANTHROPIC_API_KEY?.trim()) return 'anthropic'
  if (env.CLOUDFLARE_ACCOUNT_ID?.trim() && env.CLOUDFLARE_API_TOKEN?.trim()) return 'cloudflare'
  if (env.GROQ_API_KEY?.trim()) return 'groq'
  return null
}

export const AI_NOT_CONFIGURED =
  'Génération IA non configurée : ajoutez CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (gratuit), GROQ_API_KEY ou ANTHROPIC_API_KEY dans Vercel.'

export async function generateText(req: AiTextRequest, env: Env = process.env): Promise<AiTextResult> {
  const provider = pickProvider(env)
  if (!provider) throw new AiError(AI_NOT_CONFIGURED, 503)
  const text =
    provider === 'anthropic' ? await viaAnthropic(req, env.ANTHROPIC_API_KEY!.trim())
    : provider === 'cloudflare' ? await viaCloudflare(req, env.CLOUDFLARE_ACCOUNT_ID!.trim(), env.CLOUDFLARE_API_TOKEN!.trim())
    : await viaGroq(req, env.GROQ_API_KEY!.trim())
  if (!text.trim()) throw new AiError('Le modèle a renvoyé une réponse vide. Réessayez.', 502)
  return { text, provider }
}

async function viaAnthropic(req: AiTextRequest, apiKey: string): Promise<string> {
  const { default: AnthropicClient } = await import('@anthropic-ai/sdk')
  const client = new AnthropicClient({ apiKey })
  // La réflexion du modèle (toujours active sur ce modèle) compte dans max_tokens : on laisse de la marge.
  // `fallbacks: 'default'` : si le modèle décline à tort un sujet légitime (émotions, bien-être…),
  // l'API relance la même demande sur un modèle de repli.
  const message = await client.beta.messages.create({
    model: AI_MODELS.anthropic,
    max_tokens: Math.max(16000, req.maxTokens * 4),
    system: req.system,
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: req.prompt }],
  })
  if (message.stop_reason === 'refusal') throw new AiError('Le modèle a refusé cette demande. Reformulez le sujet.', 422)
  if (message.stop_reason === 'max_tokens') throw new AiError('Réponse trop longue : demandez un contenu plus court.', 422)
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

/** Texte d'une réponse Workers AI : `result.response` (chaîne, parfois déjà un objet JSON). */
export function cloudflareText(data: unknown): string {
  const result = (data as { result?: { response?: unknown } } | null)?.result
  const r = result?.response
  if (typeof r === 'string') return r
  if (r && typeof r === 'object') return JSON.stringify(r)
  return ''
}

async function viaCloudflare(req: AiTextRequest, accountId: string, token: string): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${AI_MODELS.cloudflare}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.prompt },
        ],
        max_tokens: req.maxTokens,
      }),
    },
  )
  if (res.status === 429) throw new AiError('Quota gratuit Cloudflare du jour atteint. Réessayez demain.', 429)
  if (!res.ok) {
    console.error('Cloudflare Workers AI error', res.status, (await res.text()).slice(0, 500))
    throw new AiError('Le service d’IA (Cloudflare) ne répond pas. Réessayez.', 502)
  }
  return cloudflareText(await res.json())
}

async function viaGroq(req: AiTextRequest, apiKey: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODELS.groq,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      max_tokens: req.maxTokens,
    }),
  })
  if (res.status === 429) throw new AiError('Quota gratuit Groq atteint. Réessayez dans quelques minutes.', 429)
  if (!res.ok) {
    console.error('Groq error', res.status, (await res.text()).slice(0, 500))
    throw new AiError('Le service d’IA (Groq) ne répond pas. Réessayez.', 502)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}
