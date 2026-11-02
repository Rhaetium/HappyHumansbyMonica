'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { QUESTIONNAIRE_DEFAULTS as T } from '@/lib/cms-defaults/questionnaire'
import type { Answers, Question } from '@/lib/questionnaires'

export type PublicQuestionnaire = {
  slug: string
  title: string
  description: string
  questions: Question[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error' }
  | { status: 'ready'; questionnaire: PublicQuestionnaire }

type SubmitState = 'idle' | 'sending' | 'done' | 'error'

const ACCENT = '#2f6b61'

export default function QuestionnaireForm({ slug }: { slug: string }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submit, setSubmit] = useState<SubmitState>('idle')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/questionnaires/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) return setLoad({ status: 'not_found' })
        if (!res.ok) return setLoad({ status: 'error' })
        const { questionnaire } = await res.json()
        setLoad({ status: 'ready', questionnaire })
      })
      .catch(() => { if (!cancelled) setLoad({ status: 'error' }) })
    return () => { cancelled = true }
  }, [slug])

  if (load.status === 'loading') {
    return <p className="py-24 text-center text-stone-500" role="status">{T.loading}</p>
  }
  if (load.status === 'not_found' || load.status === 'error') {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-serif font-light text-stone-900">{T.not_found_title}</h1>
        {load.status === 'not_found' && <p className="mt-3 text-stone-600">{T.not_found_text}</p>}
        {load.status === 'error' && <p className="mt-3 text-stone-600">{T.error_network}</p>}
      </div>
    )
  }

  const { questionnaire } = load

  if (submit === 'done') {
    return (
      <div className="py-24 text-center" role="status">
        <h1 className="text-3xl font-serif font-light text-stone-900">{T.success_title}</h1>
        <p className="mt-3 text-stone-600">{T.success_text}</p>
      </div>
    )
  }

  const setAnswer = (id: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
    setErrors([])
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Contrôle minimal côté navigateur ; le serveur revalide tout.
    const missing = questionnaire.questions
      .filter(q => q.required && (answers[q.id] === undefined || answers[q.id] === ''))
      .map(q => `« ${q.label} » : ${T.error_invalid}`)
    if (missing.length) {
      setErrors(missing)
      const firstId = questionnaire.questions.find(q => q.required && (answers[q.id] === undefined || answers[q.id] === ''))?.id
      if (firstId) document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmit('sending')
    setErrors([])
    try {
      const res = await fetch(`/api/questionnaires/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answers as Answers,
          participant: { name: name.trim(), email: email.trim() },
        }),
      })
      if (res.ok) return setSubmit('done')
      const data = await res.json().catch(() => ({}))
      setErrors(Array.isArray(data.details) && data.details.length ? data.details : [T.error_generic])
      setSubmit('error')
    } catch {
      setErrors([T.error_network])
      setSubmit('error')
    }
  }

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 md:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-serif font-light leading-tight text-stone-900 md:text-4xl">{questionnaire.title}</h1>
        {questionnaire.description && (
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-stone-600">{questionnaire.description}</p>
        )}
        <p className="mt-4 text-xs text-stone-500">{T.required_note}</p>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {questionnaire.questions.map((q, index) => (
          <fieldset key={q.id} id={`q-${q.id}`} className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <legend className="mb-4 px-0 text-base font-semibold leading-snug text-stone-900">
              <span className="mr-2 text-stone-400">{index + 1}.</span>
              {q.label}
              {q.required && <span className="ml-1 text-amber-800" aria-hidden="true">{T.required_mark}</span>}
            </legend>

            {q.type === 'scale' && (
              <ScaleInput
                question={q}
                value={typeof answers[q.id] === 'number' ? (answers[q.id] as number) : undefined}
                onChange={v => setAnswer(q.id, v)}
              />
            )}

            {q.type === 'choice' && (
              <div className="space-y-2" role="radiogroup" aria-label={q.label}>
                {(q.options ?? []).map(opt => {
                  const checked = answers[q.id] === opt
                  return (
                    <label
                      key={opt}
                      className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${checked ? 'border-[#2f6b61] bg-[#eef5f3] text-stone-900' : 'border-stone-200 text-stone-700 hover:border-stone-300'}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={checked}
                        onChange={() => setAnswer(q.id, opt)}
                        className="h-4 w-4 accent-[#2f6b61]"
                      />
                      <span>{opt}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'text' && (
              <textarea
                value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={T.text_placeholder}
                aria-label={q.label}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 focus:border-[#2f6b61] focus:outline-none focus:ring-2 focus:ring-[#2f6b61]/20"
              />
            )}
          </fieldset>
        ))}

        <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <label className="block text-sm text-stone-700">
            <span className="mb-1 block">{T.name_label}</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              maxLength={200}
              className="min-h-[48px] w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-base focus:border-[#2f6b61] focus:outline-none"
            />
          </label>
          <label className="block text-sm text-stone-700">
            <span className="mb-1 block">{T.email_label}</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              maxLength={320}
              className="min-h-[48px] w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-base focus:border-[#2f6b61] focus:outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submit === 'sending'}
          className="min-h-[52px] w-full rounded-full px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#235249] disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {submit === 'sending' ? T.submitting : T.submit}
        </button>
      </form>
    </article>
  )
}

function ScaleInput({ question, value, onChange }: { question: Question; value?: number; onChange: (v: number) => void }) {
  const min = question.min ?? 1
  const max = question.max ?? 10
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={T.scale_group_label}>
        {points.map(p => {
          const checked = value === p
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={String(p)}
              onClick={() => onChange(p)}
              className={`min-h-[48px] min-w-[44px] flex-1 rounded-xl border px-2 text-sm font-semibold transition ${checked ? 'border-[#2f6b61] bg-[#2f6b61] text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-[#2f6b61]'}`}
            >
              {p}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between gap-4 text-xs text-stone-500">
        <span>{question.minLabel ?? T.scale_low_default}</span>
        <span className="text-right">{question.maxLabel ?? T.scale_high_default}</span>
      </div>
    </div>
  )
}
