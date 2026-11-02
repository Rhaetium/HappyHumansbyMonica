'use client'
// Onglet « 📋 Questionnaires » de l'administration : liste, éditeur, générateur IA,
// QR code de chaque questionnaire, et tableau de bord des réponses (filtres participant / date).
import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { SITE_URL } from '@/lib/site-url'
import { LIMITS, QUESTION_TYPES, slugify, type Question, type QuestionType, type SubmissionRow } from '@/lib/questionnaires'

type Row = {
  id: string
  slug: string
  title: string
  description: string | null
  category: string | null
  questions: Question[]
  is_active: boolean
  created_at: string
  submission_count: number
}

// Question en cours d'édition : les options restent du texte brut (une par ligne) pendant la frappe.
type EditableQuestion = Question & { optionsText?: string }

type Draft = {
  id?: string
  title: string
  slug: string
  slugTouched: boolean
  description: string
  category: string
  is_active: boolean
  questions: EditableQuestion[]
}

type View = 'list' | 'editor' | 'generator' | 'responses'

const TYPE_LABEL: Record<QuestionType, string> = {
  scale: 'Échelle',
  text: 'Texte libre',
  choice: 'Choix multiple (une réponse)',
}

const field = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#2d5f54] focus:outline-none'
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50'
const btnPrimary = `${btn} bg-[#2d5f54] text-white hover:bg-[#244c44]`
const btnGhost = `${btn} bg-stone-100 text-stone-700 hover:bg-stone-200`
const btnDanger = `${btn} bg-red-50 text-red-700 hover:bg-red-100`

function emptyQuestion(index: number): EditableQuestion {
  return { id: `q${index + 1}`, label: '', type: 'text', required: false }
}

function blankDraft(): Draft {
  return {
    title: '', slug: '', slugTouched: false, description: '', category: 'general', is_active: true,
    questions: [{ ...emptyQuestion(0), type: 'scale', min: 1, max: 5, required: true }],
  }
}

function draftFromRow(row: Row): Draft {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    slugTouched: true,
    description: row.description ?? '',
    category: row.category ?? 'general',
    is_active: row.is_active,
    questions: (row.questions ?? []).map(q => ({ ...q, optionsText: (q.options ?? []).join('\n') })),
  }
}

/** Brouillon → corps de requête (les options texte deviennent un tableau). */
function draftToPayload(d: Draft) {
  return {
    title: d.title,
    slug: d.slug,
    description: d.description,
    category: d.category,
    is_active: d.is_active,
    questions: d.questions.map(({ optionsText, ...q }) => ({
      ...q,
      options: q.type === 'choice' ? (optionsText ?? '').split('\n').map(s => s.trim()).filter(Boolean) : undefined,
    })),
  }
}

async function api<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...(init.headers ?? {}) } : init?.headers,
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => ({}))) as T
  return { ok: res.ok, status: res.status, data }
}

type ResponseFilters = { participant: string; from: string; to: string }

function filterQuery(f: ResponseFilters) {
  const p = new URLSearchParams()
  if (f.participant.trim()) p.set('participant', f.participant.trim())
  if (f.from) p.set('from', f.from)
  if (f.to) p.set('to', f.to)
  return p.toString()
}

function publicUrl(slug: string) {
  return `${SITE_URL}/q/${slug}`
}

export default function QuestionnairesAdmin() {
  const [view, setView] = useState<View>('list')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string; details?: string[] } | null>(null)

  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [qrFor, setQrFor] = useState<{ slug: string; dataUrl: string } | null>(null)

  const loadList = useCallback(async () => {
    const { ok, data } = await api<{ questionnaires?: Row[]; error?: string }>('/api/cms/questionnaires')
    setLoading(false)
    if (!ok) return setNotice({ kind: 'err', text: data.error ?? 'Chargement impossible.' })
    setRows(data.questionnaires ?? [])
  }, [])

  // Chargement initial : l'état n'est mis à jour qu'après la réponse, jamais de façon synchrone dans l'effet.
  useEffect(() => {
    let cancelled = false
    api<{ questionnaires?: Row[]; error?: string }>('/api/cms/questionnaires').then(({ ok, data }) => {
      if (cancelled) return
      setLoading(false)
      if (ok) setRows(data.questionnaires ?? [])
      else setNotice({ kind: 'err', text: data.error ?? 'Chargement impossible.' })
    })
    return () => { cancelled = true }
  }, [])

  const flash = (kind: 'ok' | 'err', text: string, details?: string[]) => setNotice({ kind, text, details })

  // ── Liste ──────────────────────────────────────────────────────────────────

  const openEditor = (row?: Row) => {
    setDraft(row ? draftFromRow(row) : blankDraft())
    setView('editor')
    setNotice(null)
  }

  const toggleQr = async (row: Row) => {
    if (qrFor?.slug === row.slug) return setQrFor(null)
    const dataUrl = await QRCode.toDataURL(publicUrl(row.slug), { width: 640, margin: 2, errorCorrectionLevel: 'M' })
    setQrFor({ slug: row.slug, dataUrl })
  }

  const removeRow = async (row: Row) => {
    if (!window.confirm(`Supprimer « ${row.title} » et ses ${row.submission_count} réponse(s) ? Action définitive.`)) return
    const { ok, data } = await api<{ error?: string }>(`/api/cms/questionnaires/${row.id}`, { method: 'DELETE' })
    if (!ok) return flash('err', data.error ?? 'Suppression impossible.')
    flash('ok', 'Questionnaire supprimé.')
    void loadList()
  }

  const toggleActive = async (row: Row) => {
    const { ok, data } = await api<{ error?: string; details?: string[] }>(`/api/cms/questionnaires/${row.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...row, is_active: !row.is_active }),
    })
    if (!ok) return flash('err', data.error ?? 'Mise à jour impossible.', data.details)
    void loadList()
  }

  // ── Éditeur ────────────────────────────────────────────────────────────────

  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }))

  const onTitleChange = (title: string) =>
    setDraft(d => ({ ...d, title, slug: d.slugTouched ? d.slug : slugify(title) }))

  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) =>
    setDraft(d => ({ ...d, questions: d.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) }))

  const moveQuestion = (index: number, dir: -1 | 1) =>
    setDraft(d => {
      const target = index + dir
      if (target < 0 || target >= d.questions.length) return d
      const qs = [...d.questions]
      ;[qs[index], qs[target]] = [qs[target], qs[index]]
      return { ...d, questions: qs }
    })

  const removeQuestion = (index: number) =>
    setDraft(d => ({ ...d, questions: d.questions.filter((_, i) => i !== index) }))

  const addQuestion = () =>
    setDraft(d => ({ ...d, questions: [...d.questions, emptyQuestion(d.questions.length)] }))

  const saveDraft = async () => {
    setSaving(true)
    const payload = draftToPayload(draft)
    const { ok, status, data } = draft.id
      ? await api<{ questionnaire?: Row; error?: string; details?: string[] }>(`/api/cms/questionnaires/${draft.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await api<{ questionnaire?: Row; error?: string; details?: string[] }>('/api/cms/questionnaires', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (!ok) return flash('err', data.error ?? `Enregistrement impossible (${status}).`, data.details)
    flash('ok', 'Questionnaire enregistré.')
    if (data.questionnaire) setDraft(draftFromRow({ ...data.questionnaire, submission_count: 0 } as Row))
    void loadList()
  }

  // ── Générateur IA ──────────────────────────────────────────────────────────

  const [gen, setGen] = useState({ topic: '', audience: '', category: 'coaching', questionCount: 6 })
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    const { ok, data } = await api<{ draft?: { title: string; slug: string; description: string; category: string; questions: Question[] }; error?: string; details?: string[] }>(
      '/api/cms/questionnaires/generate',
      { method: 'POST', body: JSON.stringify(gen) },
    )
    setGenerating(false)
    if (!ok || !data.draft) return flash('err', data.error ?? 'Génération impossible.', data.details)
    // Le brouillon IA ouvre l'éditeur : il n'est enregistré qu'après relecture.
    setDraft({
      title: data.draft.title,
      slug: data.draft.slug,
      slugTouched: true,
      description: data.draft.description,
      category: data.draft.category,
      is_active: false,
      questions: data.draft.questions.map(q => ({ ...q, optionsText: (q.options ?? []).join('\n') })),
    })
    setView('editor')
    flash('ok', 'Brouillon généré : relisez chaque question, puis enregistrez. Il reste inactif tant que vous ne l\'activez pas.')
  }

  // ── Réponses ───────────────────────────────────────────────────────────────

  const [answers, setAnswers] = useState<{ questions: Question[]; submissions: SubmissionRow[]; count: number; truncated: boolean } | null>(null)
  const [filters, setFilters] = useState({ participant: '', from: '', to: '' })
  const [loadingAnswers, setLoadingAnswers] = useState(false)

  const loadAnswers = useCallback(async (row: Row, f: typeof filters) => {
    setLoadingAnswers(true)
    const qs = filterQuery(f)
    const { ok, data } = await api<any>(`/api/cms/questionnaires/${row.id}/submissions${qs ? `?${qs}` : ''}`)
    setLoadingAnswers(false)
    if (!ok) return flash('err', data.error ?? 'Lecture des réponses impossible.')
    setAnswers(data)
  }, [])

  const openResponses = (row: Row) => {
    setSelected(row)
    setFilters({ participant: '', from: '', to: '' })
    setAnswers(null)
    setView('responses')
    void loadAnswers(row, { participant: '', from: '', to: '' })
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#2d5f54]">📋 Questionnaires</h2>
        {view === 'list' && (
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => setView('generator')}>✨ Générer avec l’IA</button>
            <button className={btnPrimary} onClick={() => openEditor()}>+ Nouveau questionnaire</button>
          </div>
        )}
        {view !== 'list' && <button className={btnGhost} onClick={() => { setView('list'); setNotice(null) }}>← Retour à la liste</button>}
      </div>

      {notice && (
        <div role="status" className={`rounded-lg border p-3 text-sm ${notice.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <p>{notice.text}</p>
          {notice.details && notice.details.length > 0 && (
            <ul className="mt-2 list-disc pl-5">{notice.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
          )}
        </div>
      )}

      {view === 'list' && (
        <section className="space-y-3">
          {loading && <p className="text-sm text-stone-500">Chargement…</p>}
          {!loading && rows.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">
              Aucun questionnaire pour l’instant. Créez-en un, ou demandez un brouillon à l’IA.
            </p>
          )}
          {rows.map(row => (
            <article key={row.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{row.title}</h3>
                  <p className="mt-1 break-all text-xs text-stone-500">/q/{row.slug} · {row.questions.length} question(s) · {row.category ?? 'général'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${row.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {row.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">{row.submission_count} réponse(s)</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => openEditor(row)}>✏️ Modifier</button>
                <button className={btnGhost} onClick={() => openResponses(row)}>📊 Réponses</button>
                <button className={btnGhost} onClick={() => toggleQr(row)}>🔳 QR code</button>
                <button className={btnGhost} onClick={() => toggleActive(row)}>{row.is_active ? 'Désactiver' : 'Activer'}</button>
                <button className={btnDanger} onClick={() => removeRow(row)}>🗑 Supprimer</button>
              </div>
              {qrFor?.slug === row.slug && (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-stone-200 p-4 sm:flex-row sm:items-start">
                  <img src={qrFor.dataUrl} alt={`QR code vers ${publicUrl(row.slug)}`} className="h-48 w-48 rounded-lg bg-white p-2" />
                  <div className="min-w-0 space-y-2 text-sm">
                    <p className="break-all font-mono text-xs text-stone-700">{publicUrl(row.slug)}</p>
                    {!row.is_active && <p className="text-xs text-amber-800">Ce questionnaire est inactif : le QR code affichera « introuvable » tant qu’il ne sera pas activé.</p>}
                    <div className="flex flex-wrap gap-2">
                      <a className={btnPrimary} href={qrFor.dataUrl} download={`qr-${row.slug}.png`}>Télécharger le PNG</a>
                      <a className={btnGhost} href={publicUrl(row.slug)} target="_blank" rel="noopener noreferrer">Ouvrir la page</a>
                      <button className={btnGhost} onClick={() => navigator.clipboard?.writeText(publicUrl(row.slug))}>Copier le lien</button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {view === 'generator' && (
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-semibold text-stone-900">Générer un brouillon avec l’IA</h3>
            <p className="mt-1 text-sm text-stone-600">Le brouillon s’ouvre dans l’éditeur. Rien n’est publié : vous relisez, modifiez, puis enregistrez.</p>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Sujet *
            <textarea className={`${field} mt-1`} rows={2} maxLength={300} placeholder="Ex. : mesurer son niveau d’énergie au travail"
              value={gen.topic} onChange={e => setGen({ ...gen, topic: e.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-stone-700">Public visé
              <input className={`${field} mt-1`} maxLength={200} value={gen.audience} onChange={e => setGen({ ...gen, audience: e.target.value })} />
            </label>
            <label className="block text-sm font-medium text-stone-700">Catégorie
              <input className={`${field} mt-1`} maxLength={40} value={gen.category} onChange={e => setGen({ ...gen, category: e.target.value })} />
            </label>
            <label className="block text-sm font-medium text-stone-700">Nombre de questions
              <input type="number" min={3} max={15} className={`${field} mt-1`} value={gen.questionCount}
                onChange={e => setGen({ ...gen, questionCount: Number(e.target.value) })} />
            </label>
          </div>
          <button className={btnPrimary} disabled={generating || gen.topic.trim().length < 3} onClick={generate}>
            {generating ? 'Génération en cours…' : '✨ Générer le brouillon'}
          </button>
        </section>
      )}

      {view === 'editor' && (
        <section className="space-y-5">
          <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700 sm:col-span-2">Titre *
              <input className={`${field} mt-1`} maxLength={LIMITS.titleMax} value={draft.title} onChange={e => onTitleChange(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-stone-700">Adresse (slug) *
              <input className={`${field} mt-1 font-mono`} maxLength={LIMITS.slugMax} value={draft.slug}
                onChange={e => setDraft(d => ({ ...d, slug: e.target.value.toLowerCase(), slugTouched: true }))} />
              <span className="mt-1 block text-xs text-stone-500 font-normal">Le lien sera /q/{draft.slug || '…'}</span>
            </label>
            <label className="block text-sm font-medium text-stone-700">Catégorie
              <input className={`${field} mt-1`} maxLength={40} value={draft.category} onChange={e => setDraftField('category', e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-stone-700 sm:col-span-2">Introduction (affichée avant les questions)
              <textarea className={`${field} mt-1`} rows={3} maxLength={LIMITS.descriptionMax} value={draft.description} onChange={e => setDraftField('description', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
              <input type="checkbox" checked={draft.is_active} onChange={e => setDraftField('is_active', e.target.checked)} className="h-4 w-4" />
              Actif (visible par les personnes qui scannent le QR code)
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-stone-900">Questions ({draft.questions.length})</h3>
            {draft.questions.map((q, i) => (
              <div key={`${q.id}-${i}`} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Question {i + 1} · <span className="font-mono normal-case">{q.id}</span></span>
                  <div className="flex gap-1">
                    <button className={btnGhost} onClick={() => moveQuestion(i, -1)} aria-label="Monter">↑</button>
                    <button className={btnGhost} onClick={() => moveQuestion(i, 1)} aria-label="Descendre">↓</button>
                    <button className={btnDanger} onClick={() => removeQuestion(i)}>Retirer</button>
                  </div>
                </div>
                <input className={field} maxLength={LIMITS.labelMax} placeholder="Libellé de la question" value={q.label}
                  onChange={e => updateQuestion(i, { label: e.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-stone-700">Type
                    <select className={`${field} mt-1`} value={q.type}
                      onChange={e => updateQuestion(i, { type: e.target.value as QuestionType, ...(e.target.value === 'scale' ? { min: 1, max: 5 } : {}) })}>
                      {QUESTION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm text-stone-700">
                    <input type="checkbox" className="h-4 w-4" checked={!!q.required} onChange={e => updateQuestion(i, { required: e.target.checked })} />
                    Réponse obligatoire
                  </label>
                </div>
                {q.type === 'scale' && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="block text-sm text-stone-700">De
                      <input type="number" className={`${field} mt-1`} value={q.min ?? 1} onChange={e => updateQuestion(i, { min: Number(e.target.value) })} />
                    </label>
                    <label className="block text-sm text-stone-700">À
                      <input type="number" className={`${field} mt-1`} value={q.max ?? 5} onChange={e => updateQuestion(i, { max: Number(e.target.value) })} />
                    </label>
                    <label className="block text-sm text-stone-700">Libellé bas
                      <input className={`${field} mt-1`} maxLength={LIMITS.optionMax} value={q.minLabel ?? ''} onChange={e => updateQuestion(i, { minLabel: e.target.value })} />
                    </label>
                    <label className="block text-sm text-stone-700">Libellé haut
                      <input className={`${field} mt-1`} maxLength={LIMITS.optionMax} value={q.maxLabel ?? ''} onChange={e => updateQuestion(i, { maxLabel: e.target.value })} />
                    </label>
                  </div>
                )}
                {q.type === 'choice' && (
                  <label className="block text-sm text-stone-700">Options (une par ligne)
                    <textarea className={`${field} mt-1`} rows={4} value={q.optionsText ?? ''} onChange={e => updateQuestion(i, { optionsText: e.target.value })} />
                  </label>
                )}
              </div>
            ))}
            <button className={btnGhost} onClick={addQuestion} disabled={draft.questions.length >= LIMITS.questionsMax}>+ Ajouter une question</button>
          </div>

          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-[#f5f3ef]/95 py-3">
            <button className={btnPrimary} disabled={saving} onClick={saveDraft}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </section>
      )}

      {view === 'responses' && selected && (
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold text-stone-900">Réponses : {selected.title}</h3>
            <p className="text-sm text-stone-600">{answers ? `${answers.count} réponse(s) affichée(s)` : 'Chargement…'}{answers?.truncated ? ' · affichage limité aux 5 000 dernières : exportez par période.' : ''}</p>
          </div>

          <form className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-4"
            onSubmit={e => { e.preventDefault(); void loadAnswers(selected, filters) }}>
            <label className="block text-sm text-stone-700 sm:col-span-2">Participant (nom ou e-mail)
              <input className={`${field} mt-1`} value={filters.participant} onChange={e => setFilters({ ...filters, participant: e.target.value })} />
            </label>
            <label className="block text-sm text-stone-700">Du
              <input type="date" className={`${field} mt-1`} value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
            </label>
            <label className="block text-sm text-stone-700">Au
              <input type="date" className={`${field} mt-1`} value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-4">
              <button type="submit" className={btnPrimary} disabled={loadingAnswers}>Filtrer</button>
              <button type="button" className={btnGhost} onClick={() => { const f = { participant: '', from: '', to: '' }; setFilters(f); void loadAnswers(selected, f) }}>Réinitialiser</button>
              <a className={btnGhost} href={`/api/cms/questionnaires/${selected.id}/submissions?format=csv${filterQuery(filters) ? `&${filterQuery(filters)}` : ''}`}>⬇ Exporter en CSV</a>
            </div>
          </form>

          {answers && answers.submissions.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">Aucune réponse pour ces critères.</p>
          )}

          {answers && answers.submissions.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-3 py-2">Date (UTC)</th>
                    <th className="px-3 py-2">Participant</th>
                    {answers.questions.map(q => <th key={q.id} className="px-3 py-2">{q.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {answers.submissions.map(s => (
                    <tr key={s.id} className="border-t border-stone-100 align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-stone-600">{new Date(s.submitted_at).toLocaleString('fr-FR', { timeZone: 'UTC' })}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-stone-900">{s.participant_name || '—'}</div>
                        <div className="text-xs text-stone-500">{s.participant_email || ''}</div>
                      </td>
                      {answers.questions.map(q => <td key={q.id} className="px-3 py-2 text-stone-700">{s.answers[q.id] ?? '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
