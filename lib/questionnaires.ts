// ── Questionnaires : types et helpers purs ─────────────────────────────────────
// Utilisé par l'admin CMS et le runner public. Aucune dépendance (pas React, pas Next).

export type QuestionType = 'scale' | 'multiple' | 'short_text' | 'long_text'

export type QuestionnaireQuestion = {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  required?: boolean
  scoring?: Record<string, number | number[] | string>
}

export type QuestionnaireTemplate = {
  id: string
  title: string
  slug: string
  description?: string
  intro_text: string
  privacy_text: string
  questions: QuestionnaireQuestion[]
  anonymous: boolean
  multi_step: boolean
  progress_label: string
  result_template?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type QuestionnaireAttempt = {
  id: string
  template_id: string
  started_at: string
  completed_at?: string
  answers: Record<string, unknown>
  result?: Record<string, unknown>
  created_at: string
}

export type QuestionnaireDailySummary = {
  day: string
  template_id: string
  total_attempts: number
  completed_attempts: number
  attempts_today: number
  completed_today: number
}

export function isValidQuestionType(type: string): type is QuestionType {
  return type === 'scale' || type === 'multiple' || type === 'short_text' || type === 'long_text'
}

export function clampQuestion(question: Record<string, unknown>): QuestionnaireQuestion | null {
  if (!question || typeof question !== 'object') return null
  const id = question.id
  const text = question.text
  const type = question.type
  if (typeof id !== 'string' || !id.trim()) return null
  if (typeof text !== 'string') return null
  if (!isValidQuestionType(type)) return null
  return {
    id: id.trim(),
    text,
    type,
    options: Array.isArray(question.options) ? question.options.filter((o): o is string => typeof o === 'string') : undefined,
    required: question.required === true,
    scoring: question.scoring && typeof question.scoring === 'object' ? question.scoring as Record<string, number | number[] | string> : undefined,
  }
}

export function normalizeQuestions(raw: unknown): QuestionnaireQuestion[] {
  if (!Array.isArray(raw)) return []
  const out: QuestionnaireQuestion[] = []
  for (const item of raw) {
    const q = clampQuestion(item as Record<string, unknown>)
    if (q) out.push(q)
  }
  return out
}

export function serializeQuestions(questions: QuestionnaireQuestion[]): string {
  return JSON.stringify(questions)
}

export function deserializeQuestions(value?: string | null): QuestionnaireQuestion[] {
  if (!value || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return normalizeQuestions(parsed)
  } catch {
    return []
  }
}

export function buildSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function attemptsCompleted(attempts: QuestionnaireAttempt[]): number {
  return attempts.filter(a => a.completed_at).length
}

export function attemptsToday(attempts: QuestionnaireAttempt[], now = new Date()): number {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return attempts.filter(a => new Date(a.created_at).getTime() >= day).length
}
