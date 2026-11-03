'use client'

import { useState, useEffect } from 'react'

interface SummaryRow {
  day: string
  template_id: string
  total_attempts: number
  completed_attempts: number
  attempts_today: number
  completed_today: number
}

interface Template {
  id: string
  slug: string
  title: string
  updated_at: string
}

interface Dashboard {
  templates: Template[]
  summary: SummaryRow[]
  today_attempts: number
  by_template: Array<{
    id: string
    slug: string
    title: string
    attempts: number
    completed: number
    attempts_today: number
    completed_today: number
  }>
}

export default function QuestionnaireDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/cms/dashboard', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Impossible de charger le récap.')
        }
        const json = await res.json()
        if (!cancelled) setDashboard(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-600">Chargement du récap…</p>
  }

  if (error || !dashboard) {
    return <p className="text-sm text-red-600">{error ?? 'Aucune donnée disponible.'}</p>
  }

  const byTemplate = dashboard.by_template
  const totalAttempts = byTemplate.reduce((acc, t) => acc + t.attempts, 0)
  const totalCompleted = byTemplate.reduce((acc, t) => acc + t.completed, 0)

  return (
    <div className=" space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Récap questionnaires</h2>
        <p className="text-sm text-slate-600">
          Nb de participations et taux de complétion, aujourd’hui et sur la période affichée.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-emerald-700">{dashboard.today_attempts}</p>
          <p className="mt-1 text-sm text-slate-600">Participations aujourd’hui</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-slate-900">{totalAttempts}</p>
          <p className="mt-1 text-sm text-slate-600">Total participations</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-slate-900">{totalCompleted}</p>
          <p className="mt-1 text-sm text-slate-600">Total complétés</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-slate-900">
            {totalAttempts > 0 ? Math.round((totalCompleted / totalAttempts) * 100) : 0}%
          </p>
          <p className="mt-1 text-sm text-slate-600">Taux de complétion</p>
        </div>
      </div>

      {byTemplate.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700">Par questionnaire</h3>
          <ul className="mt-2 space-y-2">
            {byTemplate.map(t => (
              <li
                key={t.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{t.attempts} participations</p>
                    <p className="text-xs text-slate-500">
                      {t.completed} complétés · {t.attempts_today} aujourd’hui
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashboard.summary.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700">Détail par jour</h3>
          <ul className="mt-2 space-y-1">
            {dashboard.summary.map(row => {
              const template = dashboard.templates.find(t => t.id === row.template_id)
              return (
                <li key={`${row.day}|${row.template_id}`} className="text-sm text-slate-700">
                  <span className="font-medium">
                    {new Date(row.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </span>
                  {' '}
                  — {template?.title ?? 'Questionnaire inconnu'}
                  {' '}
                  — {row.total_attempts} participations, {row.completed_attempts} complétés
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
