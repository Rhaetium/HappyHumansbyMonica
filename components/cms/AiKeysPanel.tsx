'use client'
// Onglet « 🤖 IA » : clés des fournisseurs d'intelligence artificielle (questionnaires, articles, carrousels).
// Les clés sont chiffrées en base et ne sont jamais renvoyées au navigateur : un champ vide veut dire « inchangé ».
import { useEffect, useState } from 'react'
import type { AiKeysStatus, ProviderStatus } from '@/lib/ai-keys'

type Notice = { kind: 'ok' | 'err'; text: string }

const input = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#2d5f54] focus:outline-none'
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50'

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data: T }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      cache: 'no-store',
    })
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T }
  } catch {
    return { ok: false, data: { error: 'Connexion impossible.' } as T }
  }
}

const SOURCE_LABEL = { vercel: 'Via Vercel', cms: 'Enregistrée ici', mixed: 'Vercel + admin' } as const

export default function AiKeysPanel() {
  const [status, setStatus] = useState<AiKeysStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notices, setNotices] = useState<Record<string, Notice>>({})

  useEffect(() => {
    let cancelled = false
    call<AiKeysStatus & { error?: string }>('/api/cms/ai-keys').then(({ ok, data }) => {
      if (cancelled) return
      if (ok) setStatus(data)
      else setLoadError(data.error ?? 'Chargement impossible.')
    })
    return () => { cancelled = true }
  }, [])

  const say = (id: string, kind: Notice['kind'], text: string) => setNotices(n => ({ ...n, [id]: { kind, text } }))
  const setDraft = (provider: string, env: string, value: string) =>
    setDrafts(d => ({ ...d, [provider]: { ...d[provider], [env]: value } }))
  const hasDraft = (id: string) => Object.values(drafts[id] ?? {}).some(v => v.trim() !== '')

  const save = async (p: ProviderStatus) => {
    setBusy(p.id)
    const { ok, data } = await call<AiKeysStatus & { error?: string }>('/api/cms/ai-keys', {
      method: 'PUT',
      body: JSON.stringify({ provider: p.id, values: drafts[p.id] ?? {} }),
    })
    setBusy(null)
    if (!ok) return say(p.id, 'err', data.error ?? 'Enregistrement impossible.')
    setStatus(data)
    setDrafts(d => ({ ...d, [p.id]: {} }))
    say(p.id, 'ok', 'Enregistré. Cliquez sur « Tester » pour vérifier que la clé fonctionne.')
  }

  const test = async (p: ProviderStatus) => {
    setBusy(p.id)
    say(p.id, 'ok', 'Test en cours…')
    const { data } = await call<{ ok?: boolean; error?: string }>('/api/cms/ai-keys/test', { method: 'POST', body: JSON.stringify({ provider: p.id }) })
    setBusy(null)
    say(p.id, data.ok ? 'ok' : 'err', data.ok ? '✅ La clé fonctionne.' : data.error ?? 'Le test a échoué.')
  }

  const remove = async (p: ProviderStatus) => {
    if (!window.confirm(`Retirer les clés de « ${p.label} » enregistrées ici ? (Celles de Vercel ne sont pas touchées.)`)) return
    setBusy(p.id)
    const { ok, data } = await call<AiKeysStatus & { error?: string }>(`/api/cms/ai-keys?provider=${p.id}`, { method: 'DELETE' })
    setBusy(null)
    if (!ok) return say(p.id, 'err', data.error ?? 'Suppression impossible.')
    setStatus(data)
    say(p.id, 'ok', 'Clés retirées.')
  }

  const setPreferred = async (preferred: string) => {
    const { ok, data } = await call<AiKeysStatus & { error?: string }>('/api/cms/ai-keys', { method: 'PUT', body: JSON.stringify({ preferred }) })
    if (ok) setStatus(data)
    else say('_global', 'err', data.error ?? 'Enregistrement impossible.')
  }

  if (loadError) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>
  if (!status) return <p className="py-8 text-center text-sm text-stone-500">Chargement…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1">
      <div>
        <h2 className="text-lg font-bold text-[#2d5f54]">🤖 Intelligence artificielle</h2>
        <p className="mt-1 text-sm text-stone-600">
          Ces clés servent aux outils de l’admin : générateur de questionnaires, articles de blog et carrousels.
          Les fournisseurs <strong>gratuits</strong> suffisent pour commencer. Les clés sont chiffrées et ne s’affichent jamais ici : un champ laissé vide reste inchangé.
        </p>
      </div>

      {!status.canStore && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Pour enregistrer des clés ici, définissez d’abord <code>CMS_PASSWORD</code> dans Vercel : il sert à les chiffrer.
        </p>
      )}

      <label className="block rounded-xl bg-white p-4 text-sm font-medium text-stone-700 shadow-sm">
        Fournisseur à utiliser en priorité
        <select className={`${input} mt-1`} value={status.preferred} onChange={e => void setPreferred(e.target.value)}>
          <option value="">Automatique (le premier qui est configuré)</option>
          {status.providers.filter(p => p.configured).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <span className="mt-1 block text-xs font-normal text-stone-500">Si le fournisseur choisi n’est plus configuré, le site en prend automatiquement un autre.</span>
        {notices._global && <span role="alert" className="mt-2 block text-xs text-red-700">{notices._global.text}</span>}
      </label>

      {status.providers.map(p => {
        const notice = notices[p.id]
        const stored = p.fields.some(f => f.source === 'cms')
        return (
          <article key={p.id} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-stone-900">{p.label}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-semibold ${p.free ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{p.free ? 'Gratuit' : 'Payant'}</span>
                <span className={`rounded-full px-2.5 py-1 font-semibold ${p.configured ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                  {p.configured && p.source ? SOURCE_LABEL[p.source] : 'Non configuré'}
                </span>
              </div>
            </div>
            <p className="text-sm text-stone-600">{p.note}</p>
            <a className="inline-block text-sm font-semibold text-[#2d5f54] underline" href={p.help.url} target="_blank" rel="noopener noreferrer">{p.help.label} ↗</a>

            {p.fields.some(f => f.unreadable) && (
              <p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                Une clé enregistrée ici est devenue illisible (le secret de chiffrement a changé). Ressaisissez-la ci-dessous.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {p.fields.map(f => (
                <label key={f.env} className="block text-sm text-stone-700">
                  {f.label}
                  <input
                    className={`${input} mt-1`}
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={f.secret && f.set ? (f.source === 'vercel' ? '•••••• (définie dans Vercel)' : '•••••• (enregistrée)') : f.placeholder}
                    // Champ contrôlé : après l'enregistrement le brouillon est vidé, donc la clé tapée disparaît de l'écran.
                    value={drafts[p.id]?.[f.env] ?? (f.secret ? '' : f.value ?? '')}
                    onChange={e => setDraft(p.id, f.env, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={`${btn} bg-[#2d5f54] text-white hover:bg-[#244c44]`} disabled={busy === p.id || !hasDraft(p.id) || !status.canStore} onClick={() => save(p)}>Enregistrer</button>
              <button className={`${btn} bg-stone-100 text-stone-700 hover:bg-stone-200`} disabled={busy === p.id || !p.configured} onClick={() => test(p)}>Tester</button>
              {stored && <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`} disabled={busy === p.id} onClick={() => remove(p)}>Retirer</button>}
            </div>

            {notice && (
              <p role="status" className={`text-sm ${notice.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{notice.text}</p>
            )}
          </article>
        )
      })}
    </div>
  )
}
