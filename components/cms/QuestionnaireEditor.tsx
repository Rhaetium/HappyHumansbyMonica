'use client'

import { useState, useCallback, useEffect } from 'react'
import type { QuestionnaireTemplate } from '@/lib/questionnaires'

type QuestionType = 'scale' | 'multiple' | 'short_text' | 'long_text'

type QuestionDraft = {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  required: boolean
}

type Props = {
  template?: QuestionnaireTemplate | null
  onSave?: (template: QuestionnaireTemplate) => void
  onCancel?: () => void
}

const TYPE_LABELS: Record<QuestionType, string> = {
  scale: 'Échelle (1-5)',
  multiple: 'Choix multiples',
  short_text: 'Réponse courte',
  long_text: 'Réponse longue',
}

function nextId(): string {
  return `q${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export default function QuestionnaireEditor({ template, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(template?.title ?? '')
  const [slug, setSlug] = useState(template?.slug ?? buildSlug(title))
  const [description, setDescription] = useState(template?.description ?? '')
  const [introText, setIntroText] = useState(template?.intro_text ?? '')
  const [privacyText, setPrivacyText] = useState(template?.privacy_text ?? '')
  const [anonymous, setAnonymous] = useState(template?.anonymous !== false)
  const [multiStep, setMultiStep] = useState(template?.multi_step === true)
  const [progressLabel, setProgressLabel] = useState(template?.progress_label ?? '')
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    template?.id
      ? [
          {
            id: nextId(),
            text: '',
            type: 'scale',
            required: true,
          },
        ]
      : []
  )
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  const buildSlug = useCallback((t: string) => {
    return t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }, [])

  const syncSlug = useCallback(
    (value: string) => {
      const raw = slug || buildSlug(value)
      setSlug(raw || 'questionnaire')
    },
    [slug, buildSlug]
  )

  const addQuestion = useCallback(() => {
    setQuestions(prev => [...prev, { id: nextId(), text: '', type: 'scale', required: true }])
  }, [])

  const removeQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }, [])

  const updateQuestion = useCallback(
    (id: string, patch: Partial<QuestionDraft>) => {
      setQuestions(prev =>
        prev.map(q => (q.id === id ? { ...q, ...patch } : q))
      )
    },
    []
  )

  const moveQuestion = useCallback(
    (id: string, dir: -1 | 1) => {
      setQuestions(prev => {
        const idx = prev.findIndex(q => q.id === id)
        if (idx < 0) return prev
        const target = idx + dir
        if (target < 0 || target >= prev.length) return prev
        const next = [...prev]
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      })
    },
    []
  )

  const handleSave = async () => {
    if (!title.trim()) {
      setNotice({ type: 'error', message: 'Le titre est obligatoire.' })
      return
    }
    if (!slug.trim()) {
      setNotice({ type: 'error', message: 'L’adresse du questionnaire est obligatoire.' })
      return
    }
    if (!introText.trim()) {
      setNotice({ type: 'error', message: 'Le texte d’introduction est obligatoire.' })
      return
    }
    if (!privacyText.trim()) {
      setNotice({ type: 'error', message: 'Le texte sur la confidentialité est obligatoire.' })
      return
    }
    if (questions.length === 0) {
      setNotice({ type: 'error', message: 'Ajoutez au moins une question.' })
      return
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      intro_text: introText.trim(),
      privacy_text: privacyText.trim(),
      anonymous,
      multi_step: multiStep,
      progress_label: progressLabel.trim() || '',
      questions: questions.map(q => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        options: q.options?.filter((o): o is string => typeof o === 'string' && o.trim()) ?? undefined,
        required: q.required,
      })),
    }

    setSaving(true)
    setNotice(null)
    try {
      await fetch('/api/cms/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onSave?.(payload)
      setNotice({ type: 'ok', message: 'Questionnaire sauvegardé.' })
    } catch {
      setNotice({ type: 'error', message: 'Impossible de sauvegarder.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Questionnaire</h2>
        <p className="text-sm text-slate-600">
          Créez le questionnaire, ses questions et ses textes d’introduction. Les réponses seront
          visibles depuis le dashboard de l’administration.
        </p>
      </div>

      {notice && (
        <div
          className={
            notice.type === 'ok'
              ? 'rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200'
              : 'rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200'
          }
        >
          {notice.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Titre</label>
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              syncSlug(e.target.value)
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
            placeholder="Ex. Test de style d’attachement"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Adresse</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
            placeholder="ex. test-attachement"
          />
          <p className="mt-1 text-xs text-slate-500">
            Exemple d’URL : /questionnaire/{slug || 'slug'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
            rows={3}
            placeholder="Court résumé affiché avant le questionnaire"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Texte d’introduction</label>
          <textarea
            value={introText}
            onChange={e => setIntroText(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
            rows={3}
            placeholder="Ce que voit l’utilisateur avant de commencer"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Note sur la confidentialité</label>
        <textarea
          value={privacyText}
          onChange={e => setPrivacyText(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
          rows={3}
          placeholder="Ex. Vos réponses ne sont pas associées à votre identité."
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={e => setAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          />
          Réponses anonymes
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiStep}
            onChange={e => setMultiStep(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          />
          Questionnaire en plusieurs étapes
        </label>
      </div>

      {multiStep && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Libellé de progression</label>
          <input
            type="text"
            value={progressLabel}
            onChange={e => setProgressLabel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
            placeholder="Ex. Question 3 sur 5"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Questions</h3>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            + Ajouter une question
          </button>
        </div>

        <ul className="mt-3 space-y-3">
          {questions.map((q, index) => (
            <li key={q.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Question {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, -1)}
                    disabled={index === 0}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-slate-100"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, 1)}
                    disabled={index === questions.length - 1}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-slate-100"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <textarea
                value={q.text}
                onChange={e => updateQuestion(q.id, { text: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
                rows={3}
                placeholder="Texte de la question"
              />

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="text-sm text-slate-600">Type</label>
                <select
                  value={q.type}
                  onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {q.type === 'multiple' && (
                  <div className="flex-1">
                    <label className="text-sm text-slate-600">Options (une par ligne)</label>
                    <textarea
                      value={(q.options ?? []).join('\n')}
                      onChange={e =>
                        updateQuestion(q.id, {
                          options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-emerald-600"
                      rows={3}
                      placeholder="Option 1\nOption 2\nOption 3"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  Obligatoire
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : 'Enregistrer le questionnaire'}
        </button>
      </div>
    </div>
  )
}
