'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { ConnectionStatus, ConnectionsStatus, FieldStatus } from '@/lib/connections'

/**
 * Onglet « 🔌 Connexions » : e-mails (Brevo), publication Instagram, photos Unsplash.
 *
 * Une valeur de Vercel l'emporte toujours sur une valeur saisie ici. Les secrets sont chiffrés en base et ne reviennent
 * JAMAIS dans le navigateur : un champ vide veut dire « inchangé ». Les réglages simples (adresses, identifiants) s'affichent.
 */

const card: React.CSSProperties = { background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
const btn: React.CSSProperties = { padding: '.5rem 1rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.84rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const btnPrimary: React.CSSProperties = { ...btn, background: '#2d5f54', color: 'white' }
const input: React.CSSProperties = { width: '100%', padding: '.55rem .75rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.9rem', boxSizing: 'border-box' }

type Notice = { ok: boolean; text: string }

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data: T }> {
  try {
    const res = await fetch(path, { ...init, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined, cache: 'no-store' })
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T }
  } catch {
    return { ok: false, data: { error: 'Connexion impossible.' } as T }
  }
}

function SourceTag({ f }: { f: FieldStatus }) {
  if (f.unreadable) return <span style={{ color: '#b45309', fontSize: '.74rem' }}>enregistrée mais illisible : ressaisissez-la</span>
  if (!f.set) return <span style={{ color: f.optional ? '#999' : '#b45309', fontSize: '.74rem' }}>{f.optional ? 'facultatif' : 'à renseigner'}</span>
  return <span style={{ color: '#1e7a4d', fontSize: '.74rem' }}>{f.source === 'vercel' ? '✓ défini dans Vercel' : '✓ enregistré ici'}</span>
}

export default function ConnectionsTab() {
  const [status, setStatus] = useState<ConnectionsStatus | null>(null)
  const [loadError, setLoadError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [busy, setBusy] = useState('')
  const [notices, setNotices] = useState<Record<string, Notice>>({})

  const load = useCallback(async () => {
    const { ok, data } = await call<ConnectionsStatus & { error?: string }>('/api/cms/connections')
    if (ok) { setStatus(data); setLoadError('') } else setLoadError(data.error ?? 'Chargement impossible.')
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { void load() }, [load])

  const say = (id: string, ok: boolean, text: string) => setNotices(n => ({ ...n, [id]: { ok, text } }))
  const setDraft = (conn: string, env: string, value: string) => setDrafts(d => ({ ...d, [conn]: { ...d[conn], [env]: value } }))
  const hasDraft = (id: string) => Object.values(drafts[id] ?? {}).some(v => v.trim() !== '')

  async function save(c: ConnectionStatus) {
    setBusy(c.id)
    const { ok, data } = await call<ConnectionsStatus & { error?: string }>('/api/cms/connections', {
      method: 'PUT', body: JSON.stringify({ connection: c.id, values: drafts[c.id] ?? {} }),
    })
    setBusy('')
    if (!ok) { say(c.id, false, data.error ?? 'Enregistrement impossible.'); return }
    setStatus(data); setDrafts(d => ({ ...d, [c.id]: {} })); say(c.id, true, 'Enregistré. Pris en compte tout de suite.')
  }

  async function clear(c: ConnectionStatus) {
    if (!window.confirm(`Retirer les valeurs de « ${c.label} » enregistrées ici ? Celles définies dans Vercel ne sont pas touchées.`)) return
    setBusy(c.id)
    const { ok, data } = await call<ConnectionsStatus & { error?: string }>(`/api/cms/connections?connection=${encodeURIComponent(c.id)}`, { method: 'DELETE' })
    setBusy('')
    if (!ok) { say(c.id, false, data.error ?? 'Suppression impossible.'); return }
    setStatus(data); setDrafts(d => ({ ...d, [c.id]: {} })); say(c.id, true, 'Valeurs retirées.')
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <h2 style={{ margin: '0 0 .3rem', fontSize: '1.3rem' }}>🔌 Connexions</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '.9rem', lineHeight: 1.5 }}>
          Les services branchés au site. Vous pouvez tout régler ici, sans passer par Vercel. Si une valeur est aussi définie dans Vercel, <strong>c’est celle de Vercel qui est utilisée</strong>.
        </p>
      </div>

      {loadError && <p style={{ color: '#b3261e' }}>{loadError}</p>}
      {!status && !loadError && <p style={{ color: '#888' }}>Chargement…</p>}
      {status && !status.canStore && (
        <p style={{ ...card, color: '#b45309', fontSize: '.86rem', margin: 0 }}>
          Les clés ne peuvent pas être enregistrées ici tant que <code>CMS_PASSWORD</code> n’est pas défini dans Vercel (il sert à les chiffrer). Les réglages simples (adresses, identifiants) restent possibles.
        </p>
      )}

      {status?.connections.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2d5f54' }}>{c.emoji} {c.label}</h3>
            <span style={{ fontSize: '.78rem', fontWeight: 700, color: c.configured ? '#1e7a4d' : '#b45309' }}>{c.configured ? '● Connecté' : '○ À configurer'}</span>
          </div>
          <p style={{ margin: '.5rem 0 1rem', fontSize: '.84rem', color: '#666', lineHeight: 1.5 }}>{c.note}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '.9rem', marginBottom: '1rem' }}>
            {c.fields.map(f => {
              const fromVercel = f.source === 'vercel'
              return (
                <div key={f.env}>
                  <label htmlFor={`${c.id}-${f.env}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.78rem', fontWeight: 700, color: '#555', marginBottom: '.25rem' }}>
                    <span>{f.label}</span><SourceTag f={f} />
                  </label>
                  <input
                    id={`${c.id}-${f.env}`}
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off" spellCheck={false}
                    disabled={fromVercel}
                    value={fromVercel ? '' : (drafts[c.id]?.[f.env] ?? '')}
                    onChange={e => setDraft(c.id, f.env, e.target.value)}
                    placeholder={fromVercel ? 'Défini dans Vercel (prioritaire)' : f.secret && f.set ? '•••••••• enregistrée : laisser vide pour ne pas changer' : (!f.secret && f.value) ? `Actuel : ${f.value}` : f.placeholder}
                    style={{ ...input, background: fromVercel ? '#f5f3ef' : 'white' }}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={() => void save(c)} disabled={busy === c.id || !hasDraft(c.id)}>{busy === c.id ? 'Vérification…' : 'Enregistrer'}</button>
            {c.fields.some(f => f.source === 'cms') && <button style={btn} onClick={() => void clear(c)} disabled={busy === c.id}>Retirer les valeurs enregistrées ici</button>}
            {c.help && <a style={btn} href={c.help.url} target="_blank" rel="noopener noreferrer">{c.help.label} ↗</a>}
            {notices[c.id] && <span style={{ fontSize: '.84rem', color: notices[c.id].ok ? '#1e7a4d' : '#b3261e' }}>{notices[c.id].text}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
