'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { SearchableOverview as Overview } from '@/lib/searchable-api'

/**
 * Visibilité dans les réponses des IA (données Searchable), pour l'onglet « Visibilité » du CMS.
 *
 * États : chargement · pas de clé (formulaire pour la coller) · erreur · chiffres.
 * Les données viennent de /api/cms/searchable/overview ; la clé, elle, ne revient JAMAIS dans le navigateur :
 * on n'envoie la clé qu'une fois (à l'enregistrement) et on ne reçoit que « configurée ou non ».
 */

type KeyStatus = { configured: boolean; source: 'vercel' | 'cms' | null; unreadable: boolean; canStore: boolean }
type Payload =
  | { configured: false; unreadable?: boolean; canStore?: boolean }
  | { configured: true; overview: Overview }
  | { configured: true; error: string; hint?: string }

const card: React.CSSProperties = { background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
const th: React.CSSProperties = { textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', padding: '.5rem .6rem', borderBottom: '1.5px solid #ece8e2' }
const td: React.CSSProperties = { padding: '.5rem .6rem', fontSize: '.86rem', color: '#333', borderBottom: '1px solid #f2efeb' }
const btn: React.CSSProperties = { padding: '.45rem .9rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { ...btn, background: '#2d5f54', color: 'white' }

const IMPACT: Record<string, { label: string; bg: string; fg: string }> = {
  critical: { label: 'Critique', bg: '#fdecea', fg: '#b3261e' },
  high: { label: 'Élevé', bg: '#fff1e0', fg: '#b45309' },
  medium: { label: 'Moyen', bg: '#eef2ff', fg: '#3b4fa8' },
  low: { label: 'Faible', bg: '#f1f1f1', fg: '#666' },
}
const PLATFORM: Record<string, string> = { chatgpt: 'ChatGPT', 'google-ai-overview': 'Google AI Overview', perplexity: 'Perplexity', gemini: 'Gemini', claude: 'Claude', copilot: 'Copilot' }

const fmt1 = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const scoreColor = (n: number | null) => (n === null ? '#aaa' : n >= 80 ? '#1e7a4d' : n >= 60 ? '#b45309' : '#b3261e')

function Sparkline({ points }: { points: { date: string; score: number }[] }) {
  if (points.length < 2) return null
  const w = 220, h = 44
  const ys = points.map(p => p.score)
  const min = Math.min(...ys), max = Math.max(...ys)
  const span = max - min || 1
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - 4 - ((p.score - min) / span) * (h - 8)}`).join(' ')
  return (
    <svg width={w} height={h} role="img" aria-label="Évolution du score de visibilité">
      <polyline points={d} fill="none" stroke="#2d5f54" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function SearchableOverview() {
  const [data, setData] = useState<Payload | null>(null)
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const [o, k] = await Promise.all([
        fetch(`/api/cms/searchable/overview${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' }),
        fetch('/api/cms/searchable/key', { cache: 'no-store' }),
      ])
      setData((await o.json()) as Payload)
      if (k.ok) setKeyStatus((await k.json()) as KeyStatus)
    } catch {
      setData({ configured: true, error: 'Impossible de joindre le serveur.', hint: 'Réessayez dans un instant.' })
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { void load() }, [load])

  async function saveKey() {
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/cms/searchable/key', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: keyInput }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setFormError([body.error, body.hint].filter(Boolean).join(' ') || 'Enregistrement impossible.'); return }
      setKeyInput('')
      await load(true)
    } finally {
      setSaving(false)
    }
  }

  async function removeKey() {
    if (!window.confirm('Retirer la clé Searchable enregistrée dans le CMS ? Les chiffres ne s’afficheront plus tant qu’une clé n’est pas remise.')) return
    await fetch('/api/cms/searchable/key', { method: 'DELETE' })
    await load(true)
  }

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2d5f54' }}>🤖 Visibilité dans les IA <span style={{ fontWeight: 400, color: '#999', fontSize: '.8rem' }}>· Searchable</span></h3>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button style={btn} onClick={() => void load(true)} disabled={loading}>{loading ? 'Chargement…' : '↻ Actualiser'}</button>
        <a style={{ ...btn, textDecoration: 'none' }} href="https://app.searchable.com/" target="_blank" rel="noopener noreferrer">Ouvrir Searchable ↗</a>
      </div>
    </div>
  )

  if (!data) return <div style={card}>{header}<p style={{ color: '#888' }}>Chargement…</p></div>

  // Pas de clé : explication + formulaire
  if (!data.configured) {
    const canStore = data.canStore !== false
    return (
      <div style={card}>
        {header}
        <p style={{ margin: '0 0 .75rem', fontSize: '.9rem', color: '#444' }}>
          {data.unreadable
            ? 'Une clé est enregistrée mais ne peut plus être lue (le secret de chiffrement a changé). Collez-la de nouveau.'
            : 'Connectez Searchable pour voir ici le score de visibilité du site dans ChatGPT, Google AI Overview et les autres IA.'}
        </p>
        <ol style={{ margin: '0 0 1rem 1.1rem', padding: 0, fontSize: '.84rem', color: '#555', lineHeight: 1.6 }}>
          <li>Dans Searchable : <strong>Paramètres → Intégrations → clés d’API</strong>, créez une clé (droit de lecture suffisant).</li>
          <li>Collez-la ci-dessous. Elle est testée puis enregistrée <strong>chiffrée</strong>, et ne s’affiche plus jamais.</li>
        </ol>
        {canStore ? (
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="sea_…" autoComplete="off" spellCheck={false}
              style={{ flex: '1 1 260px', padding: '.55rem .75rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.9rem' }} />
            <button style={btnPrimary} onClick={() => void saveKey()} disabled={saving || !keyInput.trim()}>{saving ? 'Test en cours…' : 'Enregistrer et tester'}</button>
          </div>
        ) : (
          <p style={{ fontSize: '.84rem', color: '#b45309' }}>Le CMS ne peut pas enregistrer de clé tant que <code>CMS_PASSWORD</code> n’est pas défini dans Vercel. Vous pouvez aussi définir la variable <code>SEARCHABLE_API_KEY</code> directement dans Vercel.</p>
        )}
        {formError && <p style={{ color: '#b3261e', fontSize: '.84rem', marginTop: '.6rem' }}>{formError}</p>}
      </div>
    )
  }

  if ('error' in data) {
    return (
      <div style={card}>
        {header}
        <p style={{ color: '#b3261e', margin: '0 0 .3rem' }}>{data.error}</p>
        {data.hint && <p style={{ color: '#666', fontSize: '.85rem', margin: 0 }}>{data.hint}</p>}
        {keyStatus?.source === 'cms' && <p style={{ marginTop: '.75rem' }}><button style={btn} onClick={() => void removeKey()}>Changer la clé</button></p>}
      </div>
    )
  }

  const o = data.overview
  const change = o.score?.change ?? null
  return (
    <div style={card}>
      {header}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>Score de visibilité (30 jours)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.6rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 700, color: scoreColor(o.score ? o.score.value : null) }}>{o.score ? fmt1(o.score.value) : '–'}</span>
            <span style={{ color: '#888', fontSize: '.85rem' }}>/ 100</span>
            {change !== null && <span style={{ color: change >= 0 ? '#1e7a4d' : '#b3261e', fontSize: '.85rem', fontWeight: 600 }}>{change >= 0 ? '▲' : '▼'} {fmt1(Math.abs(change))}</span>}
          </div>
          {o.score && <div style={{ fontSize: '.78rem', color: '#888' }}>{o.score.responses.toLocaleString('fr-FR')} réponses d’IA analysées · {o.score.citations.toLocaleString('fr-FR')} citations</div>}
        </div>
        <Sparkline points={o.trend} />
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {o.platforms.map(p => (
            <span key={p.id} style={{ background: '#f5f3ef', borderRadius: '9999px', padding: '.25rem .7rem', fontSize: '.78rem', color: '#444' }}>{PLATFORM[p.id] ?? p.id} · {fmt1(p.visibilityRate)} %</span>
          ))}
        </div>
      </div>

      <h4 style={{ margin: '0 0 .4rem', fontSize: '.9rem' }}>À faire en priorité <span style={{ fontWeight: 400, color: '#999' }}>({o.opportunities.total} recommandations{o.opportunities.byImpact.high ? ` dont ${o.opportunities.byImpact.high} à impact élevé` : ''})</span></h4>
      <ul style={{ listStyle: 'none', margin: '0 0 1.25rem', padding: 0 }}>
        {o.opportunities.top.map(op => {
          const i = IMPACT[op.impact] ?? IMPACT.low
          return (
            <li key={op.id} style={{ display: 'flex', gap: '.6rem', alignItems: 'baseline', padding: '.35rem 0', borderBottom: '1px solid #f2efeb', fontSize: '.86rem' }}>
              <span style={{ background: i.bg, color: i.fg, borderRadius: '.4rem', padding: '.1rem .5rem', fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{i.label}</span>
              <span>{op.title}</span>
            </li>
          )
        })}
      </ul>
      <p style={{ fontSize: '.74rem', color: '#999', margin: '-.8rem 0 1.25rem' }}>Les titres des recommandations sont en anglais, tels que fournis par Searchable.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div>
          <h4 style={{ margin: '0 0 .4rem', fontSize: '.9rem' }}>Qualité des pages (audit Searchable)</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Page</th><th style={th}>Technique</th><th style={th}>IA</th></tr></thead>
            <tbody>
              {o.audits.slice(0, 8).map(a => (
                <tr key={a.slug}>
                  <td style={td}>{a.slug}</td>
                  <td style={{ ...td, color: scoreColor(a.technical), fontWeight: 600 }}>{a.technical ?? '–'}</td>
                  <td style={{ ...td, color: scoreColor(a.aeo), fontWeight: 600 }}>{a.aeo ?? '–'}</td>
                </tr>
              ))}
              {o.audits.length === 0 && <tr><td style={td} colSpan={3}>Aucun audit pour le moment.</td></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <h4 style={{ margin: '0 0 .4rem', fontSize: '.9rem' }}>Visibilité par thème</h4>
          {o.topics.slice(0, 8).map(t => (
            <div key={t.id} style={{ marginBottom: '.5rem', fontSize: '.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.name}</span><span style={{ color: '#666' }}>{fmt1(t.visibility)} % · {t.promptCount} questions</span></div>
              <div style={{ background: '#f0ede8', borderRadius: '9999px', height: '6px' }}>
                <div style={{ width: `${Math.min(100, t.visibility)}%`, background: '#2d5f54', height: '6px', borderRadius: '9999px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '.74rem', color: '#aaa', margin: '1.25rem 0 0' }}>
        {o.project.domain} · mis à jour le {new Date(o.fetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        {keyStatus?.source === 'vercel' && ' · clé fournie par Vercel'}
        {keyStatus?.source === 'cms' && <> · clé enregistrée dans le CMS <button onClick={() => void removeKey()} style={{ background: 'none', border: 'none', color: '#b3261e', cursor: 'pointer', fontSize: '.74rem', textDecoration: 'underline' }}>retirer</button></>}
      </p>
    </div>
  )
}
