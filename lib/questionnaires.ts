// Questionnaires dynamiques — logique pure (aucun accès réseau ni base).
// Partagée par les routes publiques, les routes CMS, le générateur IA et l'interface.
// Toute donnée venant du navigateur ou de l'IA passe par ces validateurs avant d'être stockée.

export const QUESTION_TYPES = ['scale', 'text', 'choice'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export type Question = {
  id: string
  label: string
  type: QuestionType
  required?: boolean
  /** type 'scale' : bornes entières (défaut 1 à 10) et libellés facultatifs aux extrémités */
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  /** type 'choice' : 2 à 20 options */
  options?: string[]
}

export type QuestionnaireInput = {
  slug: string
  title: string
  description: string
  category: string
  questions: Question[]
  is_active: boolean
}

export type Answers = Record<string, string | number>

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

export const LIMITS = {
  titleMax: 200,
  descriptionMax: 2000,
  labelMax: 300,
  questionsMax: 50,
  optionsMax: 20,
  optionMax: 200,
  textAnswerMax: 2000,
  nameMax: 200,
  emailMax: 320,
  slugMin: 3,
  slugMax: 80,
  scaleSpanMax: 10,
} as const

const ID_RE = /^[a-z][a-z0-9_-]{0,39}$/i
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Slug d'URL à partir d'un titre : « Bilan d’énergie » → « bilan-denergie » */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.slugMax)
    .replace(/-+$/, '')
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v)
}

/** Valide une question seule. `index` sert à produire des messages lisibles. */
export function validateQuestion(raw: unknown, index: number): ValidationResult<Question> {
  const errors: string[] = []
  const q = (raw ?? {}) as Record<string, unknown>
  const n = index + 1

  const id = str(q.id)
  if (!ID_RE.test(id)) errors.push(`Question ${n} : identifiant invalide (lettres, chiffres, _ ou -, 40 car. max).`)

  const label = str(q.label)
  if (!label) errors.push(`Question ${n} : le libellé est vide.`)
  if (label.length > LIMITS.labelMax) errors.push(`Question ${n} : libellé trop long (${LIMITS.labelMax} car. max).`)

  const type = q.type
  if (typeof type !== 'string' || !(QUESTION_TYPES as readonly string[]).includes(type)) {
    errors.push(`Question ${n} : type inconnu (attendu : scale, text ou choice).`)
    return { ok: false, errors }
  }

  const out: Question = { id, label, type: type as QuestionType, required: q.required === true }

  if (type === 'scale') {
    const min = q.min === undefined ? 1 : q.min
    const max = q.max === undefined ? 10 : q.max
    if (!isInt(min) || !isInt(max)) errors.push(`Question ${n} : les bornes d'une échelle doivent être des entiers.`)
    else if (max <= min) errors.push(`Question ${n} : la borne haute doit être supérieure à la borne basse.`)
    else if (max - min > LIMITS.scaleSpanMax) errors.push(`Question ${n} : échelle trop large (${LIMITS.scaleSpanMax} points max).`)
    else {
      out.min = min
      out.max = max
    }
    const minLabel = str(q.minLabel)
    const maxLabel = str(q.maxLabel)
    if (minLabel) out.minLabel = minLabel.slice(0, LIMITS.optionMax)
    if (maxLabel) out.maxLabel = maxLabel.slice(0, LIMITS.optionMax)
  }

  if (type === 'choice') {
    const options = Array.isArray(q.options)
      ? q.options.map(o => str(o)).filter(Boolean)
      : []
    if (options.length < 2) errors.push(`Question ${n} : un choix multiple demande au moins 2 options.`)
    else if (options.length > LIMITS.optionsMax) errors.push(`Question ${n} : ${LIMITS.optionsMax} options maximum.`)
    else if (options.some(o => o.length > LIMITS.optionMax)) errors.push(`Question ${n} : option trop longue.`)
    else if (new Set(options).size !== options.length) errors.push(`Question ${n} : deux options identiques.`)
    else out.options = options
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: out }
}

/** Valide un questionnaire complet envoyé par l'admin ou par le générateur. */
export function validateQuestionnaire(raw: unknown): ValidationResult<QuestionnaireInput> {
  const body = (raw ?? {}) as Record<string, unknown>
  const errors: string[] = []

  const title = str(body.title)
  if (!title) errors.push('Le titre est obligatoire.')
  if (title.length > LIMITS.titleMax) errors.push(`Titre trop long (${LIMITS.titleMax} car. max).`)

  const description = str(body.description)
  if (description.length > LIMITS.descriptionMax) errors.push(`Description trop longue (${LIMITS.descriptionMax} car. max).`)

  let slug = str(body.slug) || slugify(title)
  if (slug.length < LIMITS.slugMin || slug.length > LIMITS.slugMax || !SLUG_RE.test(slug)) {
    errors.push('Adresse (slug) invalide : lettres minuscules, chiffres et tirets uniquement.')
  }

  const category = str(body.category) || 'general'
  if (!/^[a-z0-9-]{1,40}$/.test(category)) errors.push('Catégorie invalide (minuscules, chiffres et tirets).')

  const rawQuestions = Array.isArray(body.questions) ? body.questions : null
  if (!rawQuestions) errors.push('La liste des questions est manquante.')
  else if (rawQuestions.length === 0) errors.push('Ajoutez au moins une question.')
  else if (rawQuestions.length > LIMITS.questionsMax) errors.push(`${LIMITS.questionsMax} questions maximum.`)

  const questions: Question[] = []
  const seen = new Set<string>()
  ;(rawQuestions ?? []).slice(0, LIMITS.questionsMax).forEach((raw, i) => {
    const res = validateQuestion(raw, i)
    if (!res.ok) return errors.push(...res.errors)
    if (seen.has(res.value.id)) return errors.push(`Identifiant de question en double : « ${res.value.id} ».`)
    seen.add(res.value.id)
    questions.push(res.value)
  })

  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      slug,
      title,
      description,
      category,
      questions,
      is_active: body.is_active !== false,
    },
  }
}

/**
 * Valide les réponses d'un participant contre les questions du questionnaire.
 * Les clés inconnues sont ignorées ; les réponses valides sont renvoyées normalisées.
 */
export function validateAnswers(questions: Question[], raw: unknown): ValidationResult<Answers> {
  const input = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const errors: string[] = []
  const out: Answers = {}

  for (const q of questions) {
    const v = input[q.id]
    const missing = v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
    if (missing) {
      if (q.required) errors.push(`« ${q.label} » est obligatoire.`)
      continue
    }

    if (q.type === 'scale') {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
      if (!isInt(n) || n < (q.min ?? 1) || n > (q.max ?? 10)) {
        errors.push(`« ${q.label} » : choisissez une valeur entre ${q.min ?? 1} et ${q.max ?? 10}.`)
      } else out[q.id] = n
    } else if (q.type === 'choice') {
      if (typeof v !== 'string' || !(q.options ?? []).includes(v)) {
        errors.push(`« ${q.label} » : réponse non proposée.`)
      } else out[q.id] = v
    } else {
      if (typeof v !== 'string') errors.push(`« ${q.label} » : texte attendu.`)
      else {
        const t = v.trim()
        if (t.length > LIMITS.textAnswerMax) errors.push(`« ${q.label} » : réponse trop longue (${LIMITS.textAnswerMax} car. max).`)
        else out[q.id] = t
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: out }
}

/** Coordonnées facultatives du participant, validées séparément. */
export function validateParticipant(raw: unknown): ValidationResult<{ name: string | null; email: string | null }> {
  const body = (raw ?? {}) as Record<string, unknown>
  const name = str(body.name)
  const email = str(body.email)
  const errors: string[] = []
  if (name.length > LIMITS.nameMax) errors.push(`Nom trop long (${LIMITS.nameMax} car. max).`)
  if (email && (email.length > LIMITS.emailMax || !EMAIL_RE.test(email))) errors.push('Adresse e-mail invalide.')
  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: { name: name || null, email: email || null } }
}

// ── Tableau de bord : filtres par participant et par date ───────────────────

export type SubmissionRow = {
  id: string
  participant_name: string | null
  participant_email: string | null
  answers: Answers
  submitted_at: string
}

export type SubmissionFilters = {
  /** sous-chaîne, insensible à la casse et aux accents, cherchée dans le nom et l'e-mail */
  participant: string
  /** AAAA-MM-JJ, inclus (date UTC de l'envoi) */
  from: string | null
  /** AAAA-MM-JJ, inclus */
  to: string | null
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Lit les filtres depuis les paramètres d'URL. Une date invalide est ignorée. */
export function parseSubmissionFilters(params: URLSearchParams): SubmissionFilters {
  const date = (k: string) => {
    const v = params.get(k) ?? ''
    return DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? v : null
  }
  let from = date('from')
  let to = date('to')
  if (from && to && from > to) [from, to] = [to, from]
  return {
    participant: (params.get('participant') ?? '').slice(0, 200),
    from,
    to,
  }
}

export function matchesSubmissionFilters(row: SubmissionRow, f: SubmissionFilters): boolean {
  if (f.participant) {
    const needle = normalizeText(f.participant)
    const hay = normalizeText(`${row.participant_name ?? ''} ${row.participant_email ?? ''}`)
    if (!hay.includes(needle)) return false
  }
  const day = row.submitted_at.slice(0, 10)
  if (f.from && day < f.from) return false
  if (f.to && day > f.to) return false
  return true
}

export function filterSubmissions(rows: SubmissionRow[], f: SubmissionFilters): SubmissionRow[] {
  return rows.filter(r => matchesSubmissionFilters(r, f))
}

// ── Export CSV (Excel français : séparateur « ; », BOM UTF-8) ────────────────

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  // Protection contre l'injection de formules dans Excel
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function submissionsToCsv(questions: Question[], rows: SubmissionRow[]): string {
  const header = ['Date (UTC)', 'Nom', 'E-mail', ...questions.map(q => q.label)]
  const lines = [header.map(csvCell).join(';')]
  for (const r of rows) {
    lines.push(
      [
        r.submitted_at,
        r.participant_name ?? '',
        r.participant_email ?? '',
        ...questions.map(q => r.answers[q.id] ?? ''),
      ].map(csvCell).join(';'),
    )
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}
