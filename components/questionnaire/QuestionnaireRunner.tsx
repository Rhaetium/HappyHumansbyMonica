'use client'

import { useState, useCallback } from 'react'

type QuestionType = 'scale' | 'multiple' | 'short_text' | 'long_text'

type Question = {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  required?: boolean
}

type Template = {
  id: string
  title: string
  slug: string
  description?: string
  intro_text: string
  privacy_text: string
  anonymous: boolean
  multi_step: boolean
  progress_label: string
  questions: Question[]
}

type AnswerMap = Record<string, unknown>

function deserializeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return []
  const out: Question[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = item.id
    const text = item.text
    const type = item.type
    if (typeof id !== 'string' || !id.trim()) continue
    if (typeof text !== 'string') continue
    if (type !== 'scale' && type !== 'multiple' && type !== 'short_text' && type !== 'long_text') continue
    out.push({
      id: id.trim(),
      text,
      type: type as QuestionType,
      options: Array.isArray(item.options)
        ? item.options.filter((o): o is string => typeof o === 'string')
        : undefined,
      required: item.required === true,
    })
  }
  return out
}

const EMOJI_TABLE = {
  scale: '📏',
  multiple: '🔘',
  short_text: '✏️',
  long_text: '📝',
}

function OptionControls({
  value,
  options,
  onChange,
}: {
  value: string | null
  options?: string[]
  onChange: (v: string | null) => void
}) {
  if (!options || options.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map(option => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(active ? null : option)}
            className={`rounded-full px-4 py-2 text-sm border transition ${
              active
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export default function QuestionnaireRunner({ template }: { template: Template }) {
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [current, setCurrent] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const questions = template.questions

  const currentQuestion = questions[current]
  const progress =
    questions.length > 0 ? Math.round(((current + 1) / questions.length) * 100) : 0

  const updateAnswer = useCallback(
    (questionId: string, value: unknown) => {
      setAnswers(prev => ({ ...prev, [questionId]: value }))
    },
    []
  )

  const next = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    }
  }, [current, questions.length])

  const prev = useCallback(() => {
    if (current > 0) {
      setCurrent(current - 1)
    }
  }, [current])

  const canGoNext = useCallback(
    (question: Question, answer: unknown): boolean => {
      if (!question.required) return true
      if (question.type === 'multiple') {
        return Array.isArray(answer) && answer.length > 0
      }
      if (question.type === 'scale') {
        return typeof answer === 'number' && !Number.isNaN(answer)
      }
      if (question.type === 'short_text' || question.type === 'long_text') {
        return typeof answer === 'string' && answer.trim().length > 0
      }
      return false
    },
    []
  )

  const handleSubmit = async (onComplete: () => void) => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/questionnaires/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          answers,
          ...(template.anonymous ? {} : { email: email.trim() || undefined }),
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Impossible d’envoyer les réponses.')
      }

      const json = await res.json()
      setSubmitted(true)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 text-emerald-800">
          <p className="text-3xl">Merci.</p>
          <p className="mt-3 text-lg">Vos réponses ont bien été enregistrées.</p>
          <p className="mt-1 text-sm opacity-80">
            {template.privacy_text
              ? template.privacy_text
              : 'Ce questionnaire est anonyme.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-emerald-900">{template.title}</h1>
        {template.description && (
          <p className="mt-2 text-slate-600">{template.description}</p>
        )}
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">{template.intro_text}</p>

        {!template.anonymous && (
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Email (optionnel)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
              placeholder="votre@email.com"
            />
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">{template.privacy_text}</p>

        {template.multi_step && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            {template.progress_label || `Question ${current + 1} sur ${questions.length}`}
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              {progress}%
            </span>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {questions.map((question, index) => {
            const active = index === current
            const answer = answers[question.id]

            return (
              <div
                key={question.id}
                className={`${
                  active ? 'block' : 'hidden'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-xl">{EMOJI_TABLE[question.type]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      Question {index + 1}
                    </p>
                    <p className="mt-1 text-base text-slate-900">{question.text}</p>
                    {question.required && (
                      <p className="mt-1 text-xs text-amber-700">Question obligatoire</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {question.type === 'scale' && (
                    <fieldset>
                      <legend className="sr-only">Échelle de 1 à 5</legend>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map(value => {
                          const activeScale = answer === value
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateAnswer(question.id, value)}
                              className={`rounded-lg px-4 py-3 text-center text-lg font-medium border transition ${
                                activeScale
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {value}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        1 = Pas du tout d’accord · 5 = Tout à fait d’accord
                      </p>
                    </fieldset>
                  )}

                  {question.type === 'multiple' && (
                    <OptionControls
                      value={typeof answer === 'string' ? answer : null}
                      options={question.options}
                      onChange={v => updateAnswer(question.id, v)}
                    />
                  )}

                  {(question.type === 'short_text' || question.type === 'long_text') && (
                    <textarea
                      value={typeof answer === 'string' ? answer : ''}
                      onChange={e => updateAnswer(question.id, e.target.value)}
                      className="min-h-[120px] mt-2 rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
                      rows={question.type === 'long_text' ? 5 : 3}
                      placeholder="Votre réponse"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={current === 0}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Précédent
          </button>

          {current < questions.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext(currentQuestion, answers[currentQuestion.id])}
              className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40 hover:bg-emerald-700"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(() => {})}
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
            >
              {submitting ? 'Envoi…' : 'Envoyer mes réponses'}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-700">{error}</p>
        )}
      </div>
    </div>
  )
}
