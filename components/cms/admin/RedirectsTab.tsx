'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { checkRedirects, MAX_REDIRECTS, type RedirectProblem, type RedirectRule } from '@/lib/redirects'

/**
 * Onglet « ↪️ Redirections » : quand une page ou un article change d'adresse, l'ancienne adresse renvoie vers la nouvelle
 * (code 301 : Google transfère le référencement, les visiteurs n'arrivent pas sur une erreur 404).
 * Les contrôles (boucle, chaîne, page existante, adresse réservée) sont ceux de lib/redirects.ts, aussi appliqués par le serveur.
 */

const card: React.CSSProperties = { background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
const btn: React.CSSProperties = { padding: '.5rem 1rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.84rem', cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { ...btn, background: '#2d5f54', color: 'white' }
const input: React.CSSProperties = { width: '100%', padding: '.55rem .75rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.9rem', boxSizing: 'border-box' }

export default function RedirectsTab() {
  const [rules, setRules] = useState<RedirectRule[]>([])
  const [saved, setSaved] = useState('[]')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/redirects', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as { rules?: RedirectRule[]; error?: string }
      if (!res.ok) { setNotice({ ok: false, text: data.error ?? 'Chargement impossible.' }); return }
      setRules(data.rules ?? [])
      setSaved(JSON.stringify(data.rules ?? []))
      setLoaded(true)
    } catch { setNotice({ ok: false, text: 'Connexion impossible.' }) }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { void load() }, [load])

  const problems = useMemo(() => checkRedirects(rules.filter(r => r.from.trim() || r.to.trim())), [rules])
  const blocking = problems.some(p => p.level === 'error')
  const dirty = JSON.stringify(rules) !== saved
  const byRow = (i: number): RedirectProblem[] => problems.filter(p => p.index === i)

  const update = (i: number, patch: Partial<RedirectRule>) => setRules(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  async function save() {
    setBusy(true); setNotice(null)
    const toSave = rules.filter(r => r.from.trim() || r.to.trim())
    try {
      const res = await fetch('/api/cms/redirects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: toSave }) })
      const data = (await res.json().catch(() => ({}))) as { rules?: RedirectRule[]; error?: string }
      if (!res.ok) { setNotice({ ok: false, text: data.error ?? 'Enregistrement impossible.' }); return }
      setRules(data.rules ?? toSave); setSaved(JSON.stringify(data.rules ?? toSave))
      setNotice({ ok: true, text: 'Enregistré. Actif dans la minute qui suit.' })
    } catch { setNotice({ ok: false, text: 'Connexion impossible.' }) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div style={card}>
        <h2 style={{ margin: '0 0 .4rem', fontSize: '1.25rem', color: '#2d5f54' }}>↪️ Redirections</h2>
        <p style={{ margin: 0, color: '#555', fontSize: '.9rem', lineHeight: 1.5 }}>
          Vous changez l’adresse d’une page ou d’un article ? Ajoutez l’ancienne adresse à gauche et la nouvelle à droite : les visiteurs
          (et Google) sont renvoyés automatiquement, sans tomber sur une erreur 404. Exemple : <code>/ancien-article</code> → <code>/blog/nouvel-article</code>.
        </p>
      </div>

      <div style={card}>
        {!loaded && !notice && <p style={{ color: '#888' }}>Chargement…</p>}
        {loaded && rules.length === 0 && <p style={{ color: '#888', marginTop: 0 }}>Aucune redirection pour l’instant.</p>}
        <div style={{ display: 'grid', gap: '.75rem' }}>
          {rules.map((r, i) => (
            <div key={i}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '.5rem', alignItems: 'center' }}>
                <input style={input} value={r.from} placeholder="/ancienne-adresse" aria-label="Ancienne adresse" onChange={e => update(i, { from: e.target.value })} />
                <span aria-hidden>→</span>
                <input style={input} value={r.to} placeholder="/nouvelle-adresse" aria-label="Nouvelle adresse" onChange={e => update(i, { to: e.target.value })} />
                <button type="button" style={btn} aria-label="Supprimer cette redirection" onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}>🗑</button>
              </div>
              {byRow(i).map((p, k) => (
                <div key={k} style={{ fontSize: '.78rem', marginTop: '.25rem', color: p.level === 'error' ? '#b91c1c' : '#a16207' }}>
                  {p.level === 'error' ? '⛔ ' : '⚠️ '}{p.message}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" style={btn} disabled={rules.length >= MAX_REDIRECTS} onClick={() => setRules(rs => [...rs, { from: '', to: '' }])}>+ Ajouter une redirection</button>
          <button type="button" style={btnPrimary} disabled={busy || !dirty || blocking} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          {dirty && <span style={{ fontSize: '.8rem', color: '#a16207' }}>Modifications non enregistrées</span>}
          {notice && <span style={{ fontSize: '.84rem', color: notice.ok ? '#1e7a4d' : '#b91c1c' }}>{notice.text}</span>}
        </div>
      </div>
    </div>
  )
}
