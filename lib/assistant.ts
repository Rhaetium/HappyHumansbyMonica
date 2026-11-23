// Assistant de contenu : Monica écrit ce qu'elle veut changer (« rends la page coaching plus chaleureuse »), l'IA propose
// de nouveaux textes pour les champs concernés. Rien n'est jamais publié : les propositions arrivent en BROUILLON,
// Monica les relit puis publie. Logique pure (choix des champs, consigne, lecture de la réponse), testée dans
// __tests__/lib/assistant.test.ts. L'appel au modèle passe par lib/ai-text.ts (fournisseur choisi dans l'onglet 🤖 IA).

import { fold, type ContentField } from '@/lib/cms-search'
import { validateField } from '@/lib/field-validation'

export const MAX_REQUEST_CHARS = 600
export const MAX_FIELDS_IN_PROMPT = 30
export const MAX_CHANGES = 8
const MAX_VALUE_IN_PROMPT = 500

/** Seuls des textes lisibles sont proposés à l'IA : ni listes JSON, ni réglages de structure, ni images. */
const EDITABLE_TYPES = new Set(['text', 'textarea', 'richtext'])
/** Les liens (adresses de boutons…) ne sont pas du texte à reformuler : l'IA n'y touche jamais. */
const LINK_KEY = /(_href|_url|_link|_email|_phone)$/i

export type AssistantChange = {
  page: string
  key: string
  pageLabel: string
  label: string
  before: string
  after: string
  reason: string
  /** avertissement de validation (ex. texte long) : proposé quand même, signalé à Monica */
  warning?: string
}

const tokens = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3)

/** Les champs les plus liés à la demande (page, libellé, texte actuel), 30 au plus ; sinon ceux de l'accueil. */
export function selectRelevantFields(index: ContentField[], request: string, max = MAX_FIELDS_IN_PROMPT): ContentField[] {
  const words = [...new Set(tokens(request))]
  const candidates = index.filter(f => EDITABLE_TYPES.has(f.type) && !LINK_KEY.test(f.key) && f.effectiveValue.trim() !== '')
  const scored = candidates.map((f, i) => {
    const page = fold(`${f.pageLabel} ${f.page}`)
    const label = fold(f.label)
    const value = fold(f.effectiveValue)
    let score = 0
    for (const w of words) {
      if (page.includes(w)) score += 5 // la demande nomme la page
      if (label.includes(w)) score += 3
      if (value.includes(w)) score += 1
    }
    return { f, score, i }
  })
  const hits = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.i - b.i)
  const pool = hits.length > 0 ? hits : scored.filter(s => s.f.page === 'home')
  return pool.slice(0, max).map(s => s.f)
}

export const ASSISTANT_SYSTEM = `Tu aides Monica Schneider à modifier les textes de son site Happy Humans (coaching, relations, sparring partner, accompagnement des organisations, « happiness design »).
Ton du site : chaleureux, direct, concret, en français, au « vous ». Tu ne poses aucun diagnostic, tu ne donnes pas de conseil médical, tu ne promets pas de résultats, et tu n'inventes ni chiffres, ni citations, ni témoignages.
On te donne la demande de Monica et une liste de champs du site : [page|clé] libellé : « texte actuel ». Propose de nouveaux textes UNIQUEMENT pour les champs qui doivent changer, en gardant les autres tels quels.
Règles : garde la même longueur à peu près, la même mise en forme (si le texte actuel contient du HTML, garde les mêmes balises simples), et ne change pas ce que Monica n'a pas demandé.
Réponds par UN SEUL objet JSON, sans texte autour ni bloc de code :
{"reply":"une phrase pour Monica qui résume ce que tu proposes","changes":[{"page":"…","key":"…","value":"nouveau texte complet","reason":"pourquoi, en une phrase courte"}]}
Si la demande n'est pas claire ou ne concerne aucun champ de la liste, renvoie "changes":[] et pose ta question dans "reply".`

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export function buildAssistantPrompt(request: string, fields: ContentField[]): string {
  const lines = fields.map(f => `[${f.page}|${f.key}] ${f.pageLabel} — ${f.label} : « ${clip(f.effectiveValue.replace(/\s+/g, ' ').trim(), MAX_VALUE_IN_PROMPT)} »`)
  return `Demande de Monica : « ${request.trim()} »\n\nChamps du site :\n${lines.join('\n')}`
}

export function maxTokensFor(fields: ContentField[]): number {
  return Math.min(4000, 800 + fields.length * 60)
}

export type AssistantResult = { reply: string; changes: AssistantChange[] }

/** Extrait l'objet JSON de la réponse (même entouré de texte ou d'un bloc de code). */
function extractJson(raw: string): unknown {
  const text = raw.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { return JSON.parse(body.slice(start, end + 1)) } catch { return null }
}

/**
 * Lit la réponse du modèle et ne garde que des changements sûrs : champ réellement proposé à l'IA, texte différent de
 * l'actuel, sans erreur de validation (adresse invalide, texte vide…). Le reste est ignoré.
 */
export function parseAssistantResponse(raw: string, fields: ContentField[]): AssistantResult {
  const data = extractJson(raw) as { reply?: unknown; changes?: unknown } | null
  if (!data || typeof data !== 'object') return { reply: '', changes: [] }
  const byId = new Map(fields.map(f => [`${f.page}|${f.key}`, f]))
  const seen = new Set<string>()
  const changes: AssistantChange[] = []
  for (const c of Array.isArray(data.changes) ? data.changes : []) {
    if (changes.length >= MAX_CHANGES) break
    const item = c as { page?: unknown; key?: unknown; value?: unknown; reason?: unknown }
    if (typeof item?.page !== 'string' || typeof item.key !== 'string' || typeof item.value !== 'string') continue
    const id = `${item.page}|${item.key}`
    const field = byId.get(id)
    if (!field || seen.has(id)) continue
    const after = item.value.trim()
    if (!after || after === field.effectiveValue.trim()) continue
    const issue = validateField({ key: field.key, label: field.label, type: field.type }, after)
    if (issue?.level === 'error') continue
    seen.add(id)
    changes.push({
      page: field.page,
      key: field.key,
      pageLabel: field.pageLabel,
      label: field.label,
      before: field.effectiveValue,
      after,
      reason: typeof item.reason === 'string' ? item.reason.trim().slice(0, 200) : '',
      ...(issue ? { warning: issue.message } : {}),
    })
  }
  return { reply: typeof data.reply === 'string' ? data.reply.trim().slice(0, 400) : '', changes }
}
