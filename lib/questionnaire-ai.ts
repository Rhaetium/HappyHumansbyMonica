// Générateur de questionnaires assisté par IA (Claude, Cloudflare Workers AI ou Groq : voir lib/ai-text.ts).
// Le modèle propose un brouillon ; rien n'est enregistré sans relecture et validation dans l'admin.
import { generateText, AiError } from '@/lib/ai-text'
import { LIMITS, validateQuestionnaire, type QuestionnaireInput, type ValidationResult } from '@/lib/questionnaires'

export type GenerateRequest = {
  topic: string
  audience?: string
  questionCount: number
  category?: string
}

const SYSTEM_PROMPT = `Tu es concepteur de questionnaires pour le site Happy Humans (coaching, accompagnement, bien-être au travail).
Tu rédiges en français, avec un ton bienveillant, clair et non médical. Tu n'établis aucun diagnostic.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :
{
  "title": "titre court",
  "description": "une phrase d'introduction pour la personne qui répond",
  "questions": [
    { "id": "q1", "label": "question formulée à la personne", "type": "scale", "required": true, "min": 1, "max": 5, "minLabel": "pas du tout", "maxLabel": "tout à fait" },
    { "id": "q2", "label": "...", "type": "choice", "required": false, "options": ["option A", "option B", "option C"] },
    { "id": "q3", "label": "...", "type": "text", "required": false }
  ]
}

Règles :
- "type" vaut exactement "scale", "choice" ou "text".
- "scale" : min et max entiers, au plus 10 points d'écart ; minLabel et maxLabel facultatifs.
- "choice" : entre 2 et 10 options, courtes et distinctes.
- "text" : question ouverte, sans options.
- Les "id" sont q1, q2, q3… sans doublon.
- Pas de questions intrusives sur la santé, la religion, l'orientation ou les opinions politiques.`

export function buildGenerationPrompt(req: GenerateRequest): string {
  const lines = [
    `Sujet du questionnaire : ${req.topic.trim()}`,
    req.audience?.trim() ? `Public visé : ${req.audience.trim()}` : null,
    `Nombre de questions : ${req.questionCount} (environ, entre 3 et 15).`,
    req.category?.trim() ? `Catégorie : ${req.category.trim()}` : null,
    'Varie les types de questions (échelles, choix, texte libre) et commence par les questions les plus simples.',
  ]
  return lines.filter(Boolean).join('\n')
}

/** Extrait le premier objet JSON d'une réponse texte (tolère les balises ```json). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('Aucun objet JSON dans la réponse.')
  return JSON.parse(candidate.slice(start, end + 1))
}

const CHOICE_OPTIONS_MAX = 10
const DEFAULT_SCALE = { min: 1, max: 5 }

/**
 * Répare les écarts fréquents des modèles gratuits avant la validation, sans rien inventer :
 * échelle incohérente ou trop large → 1 à 5 ; champs sans rapport avec le type retirés ;
 * options vides ou en double retirées ; identifiants renumérotés q1, q2… ; textes trop longs tronqués.
 * Ce qui reste irréparable (type inconnu, choix avec moins de 2 options, libellé vide) est refusé
 * ensuite par validateQuestionnaire, comme pour une saisie manuelle.
 */
export function normalizeGeneratedQuestionnaire(raw: unknown): Record<string, unknown> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const questions = (Array.isArray(body.questions) ? body.questions : [])
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .map((q, i) => {
      const type = text(q.type).toLowerCase()
      const out: Record<string, unknown> = {
        id: `q${i + 1}`,
        label: text(q.label).slice(0, LIMITS.labelMax),
        type,
        required: q.required === true,
      }
      if (type === 'scale') {
        const min = Number(q.min)
        const max = Number(q.max)
        const valid = Number.isInteger(min) && Number.isInteger(max) && max > min && max - min <= LIMITS.scaleSpanMax
        Object.assign(out, valid ? { min, max } : DEFAULT_SCALE)
        if (text(q.minLabel)) out.minLabel = text(q.minLabel)
        if (text(q.maxLabel)) out.maxLabel = text(q.maxLabel)
      }
      if (type === 'choice') {
        const options = (Array.isArray(q.options) ? q.options : []).map(text).filter(Boolean)
        out.options = [...new Set(options)].slice(0, CHOICE_OPTIONS_MAX).map(o => o.slice(0, LIMITS.optionMax))
      }
      return out
    })
  return {
    title: text(body.title).slice(0, LIMITS.titleMax),
    description: text(body.description).slice(0, LIMITS.descriptionMax),
    questions,
  }
}

/** Transforme la sortie brute du modèle en questionnaire validé (même règles que le formulaire manuel). */
export function parseGeneratedQuestionnaire(text: string, category: string): ValidationResult<QuestionnaireInput> {
  let parsed: unknown
  try {
    parsed = extractJsonObject(text)
  } catch (e) {
    return { ok: false, errors: [`Réponse IA illisible : ${e instanceof Error ? e.message : 'erreur inconnue'}`] }
  }
  return validateQuestionnaire({ ...normalizeGeneratedQuestionnaire(parsed), category, is_active: false, slug: undefined })
}

/** Conservé pour la route : même forme (message + statut HTTP) que les erreurs du module IA. */
export { AiError as QuestionnaireAiError }

export async function generateQuestionnaire(req: GenerateRequest): Promise<ValidationResult<QuestionnaireInput>> {
  const { text } = await generateText({
    system: SYSTEM_PROMPT,
    prompt: buildGenerationPrompt(req),
    // ~150 tokens par question (libellé + options) ; large marge pour les modèles bavards.
    maxTokens: 600 + req.questionCount * 250,
  })
  return parseGeneratedQuestionnaire(text, req.category?.trim() || 'general')
}
