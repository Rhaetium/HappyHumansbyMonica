// Génération de texte par IA pour les outils de l'admin (questionnaires, blog, carrousels).
//
// Un seul point d'entrée, plusieurs fournisseurs, choisis selon les variables présentes dans Vercel :
//   1. Claude (Anthropic)        — ANTHROPIC_API_KEY                         (payant, meilleure qualité)
//   2. Cloudflare Workers AI     — CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (offre gratuite quotidienne)
//   3. Groq                      — GROQ_API_KEY                              (offre gratuite)
//   4. Google Gemini             — GEMINI_API_KEY                            (offre gratuite)
// Les clés viennent de Vercel ou, à défaut, de l'admin (🤖 IA, chiffrées en base : lib/ai-keys.ts).
// Le premier fournisseur configuré est utilisé, sauf si « AI_PROVIDER » en désigne un autre (réglage de l'admin).
// Aucun n'est configuré → AiError 503.
// Le SDK Anthropic (lourd) n'est chargé que s'il sert : voir viaAnthropic.
import type Anthropic from '@anthropic-ai/sdk'
import { loadAiEnv } from '@/lib/ai-keys'
import type { AiProviderId } from '@/lib/ai-providers'

export type AiProvider = AiProviderId

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
  // Modèle par défaut de l'offre gratuite ; modifiable sans code (admin → 🤖 IA, ou GEMINI_MODEL dans Vercel).
  gemini: 'gemini-2.5-flash',
} as const

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

type Env = Record<string, string | undefined>

// Ordre de priorité quand aucun fournisseur n'est désigné. Gemini est ajouté à la fin : l'ordre existant ne change pas.
const ORDER: AiProvider[] = ['anthropic', 'cloudflare', 'groq', 'gemini']

const READY: Record<AiProvider, (env: Env) => boolean> = {
  anthropic: env => !!env.ANTHROPIC_API_KEY?.trim(),
  cloudflare: env => !!env.CLOUDFLARE_ACCOUNT_ID?.trim() && !!env.CLOUDFLARE_API_TOKEN?.trim(),
  groq: env => !!env.GROQ_API_KEY?.trim(),
  gemini: env => !!env.GEMINI_API_KEY?.trim(),
}

/**
 * Fournisseur à utiliser d'après les variables d'environnement (null si aucun).
 * « AI_PROVIDER » désigne le fournisseur préféré ; s'il n'est pas configuré, on retombe sur l'ordre par défaut.
 */
export function pickProvider(env: Env = process.env): AiProvider | null {
  const preferred = env.AI_PROVIDER?.trim() as AiProvider | undefined
  if (preferred && READY[preferred]?.(env)) return preferred
  return ORDER.find(p => READY[p](env)) ?? null
}

export const AI_NOT_CONFIGURED =
  'Génération IA non configurée : ajoutez une clé gratuite (Gemini, Groq ou Cloudflare) dans l’admin, onglet 🤖 IA, ou dans Vercel.'

/**
 * Génère un texte. Sans `env`, les clés sont lues dans Vercel puis dans l'admin (🤖 IA).
 * Avec `env` (tests, bouton « Tester »), seul cet environnement est utilisé.
 */
export async function generateText(req: AiTextRequest, env?: Env): Promise<AiTextResult> {
  const keys = env ?? (await loadAiEnv())
  const provider = pickProvider(keys)
  if (!provider) throw new AiError(AI_NOT_CONFIGURED, 503)
  const text =
    provider === 'anthropic' ? await viaAnthropic(req, keys.ANTHROPIC_API_KEY!.trim())
    : provider === 'cloudflare' ? await viaCloudflare(req, keys.CLOUDFLARE_ACCOUNT_ID!.trim(), keys.CLOUDFLARE_API_TOKEN!.trim())
    : provider === 'gemini' ? await viaGemini(req, keys.GEMINI_API_KEY!.trim(), keys.GEMINI_MODEL?.trim() || AI_MODELS.gemini)
    : await viaGroq(req, keys.GROQ_API_KEY!.trim())
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

/** Texte d'une réponse Gemini (generateContent) : on assemble les morceaux de la première réponse. */
export function geminiText(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts
  return (parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('')
}

// Les modèles Gemini « réfléchissent » avant de répondre et ce raisonnement compte dans la limite de sortie :
// sans marge, une réponse courte pourrait être tronquée ou vide.
const GEMINI_THINKING_HEADROOM = 4096

async function viaGemini(req: AiTextRequest, apiKey: string, model: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: { maxOutputTokens: req.maxTokens + GEMINI_THINKING_HEADROOM },
      }),
    },
  )
  if (res.status === 429) throw new AiError('Quota gratuit Gemini atteint. Réessayez plus tard.', 429)
  if (!res.ok) {
    const detail = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? ''
    console.error('Gemini error', res.status, detail.slice(0, 300))
    const hint = res.status === 400 || res.status === 403 ? ' Vérifiez la clé et le nom du modèle.' : ''
    throw new AiError(`Le service d’IA (Gemini) a refusé la demande (code ${res.status}).${hint}`, 502)
  }
  return geminiText(await res.json())
}
