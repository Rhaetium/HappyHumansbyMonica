// Générateur de questionnaires assisté par IA (Claude).
// Le modèle propose un brouillon ; rien n'est enregistré sans relecture et validation dans l'admin.
import Anthropic from '@anthropic-ai/sdk'
import { validateQuestionnaire, type QuestionnaireInput, type ValidationResult } from '@/lib/questionnaires'

export const QUESTIONNAIRE_MODEL = 'claude-opus-5-5'

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

/** Transforme la sortie brute du modèle en questionnaire validé (même règles que le formulaire manuel). */
export function parseGeneratedQuestionnaire(text: string, category: string): ValidationResult<QuestionnaireInput> {
  let parsed: unknown
  try {
    parsed = extractJsonObject(text)
  } catch (e) {
    return { ok: false, errors: [`Réponse IA illisible : ${e instanceof Error ? e.message : 'erreur inconnue'}`] }
  }
  const body = (parsed ?? {}) as Record<string, unknown>
  return validateQuestionnaire({ ...body, category, is_active: false, slug: undefined })
}

export class QuestionnaireAiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function generateQuestionnaire(req: GenerateRequest): Promise<ValidationResult<QuestionnaireInput>> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new QuestionnaireAiError('Génération IA non configurée : variable ANTHROPIC_API_KEY manquante.', 503)

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: QUESTIONNAIRE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: buildGenerationPrompt(req) }],
  })

  if (message.stop_reason === 'refusal') throw new QuestionnaireAiError('Le modèle a refusé cette demande. Reformulez le sujet.', 422)
  if (message.stop_reason === 'max_tokens') throw new QuestionnaireAiError('Réponse trop longue : demandez moins de questions.', 422)

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  return parseGeneratedQuestionnaire(text, req.category?.trim() || 'general')
}
