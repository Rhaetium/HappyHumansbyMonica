'use client'

import { useState } from 'react'
import QuestionnaireEditor from '@/components/cms/QuestionnaireEditor'
import QuestionnaireDashboard from '@/components/cms/QuestionnaireDashboard'

export default function QuestionnairesAdminPage() {
  const [tab, setTab] = useState<'create' | 'dashboard'>('create')
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)

  const handleSave = (payload: Record<string, unknown>) => {
    setDraft(payload)
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-900">Questionnaires</h1>
          <p className="mt-1 text-sm text-slate-600">
            Créez un questionnaire et voyez les participations par jour.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === 'create'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            Créer / éditer
          </button>
          <button
            type="button"
            onClick={() => setTab('dashboard')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === 'dashboard'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            Récap par jour
          </button>
        </div>
      </header>

      {tab === 'create' && (
        <QuestionnaireEditor onSave={handleSave} />
      )}

      {tab === 'dashboard' && (
        <QuestionnaireDashboard />
      )}

      {draft && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Questionnaire enregistré.
        </div>
      )}
    </div>
  )
}
