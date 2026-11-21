'use client'

import React, { useCallback, useEffect, useState } from 'react'
import SearchableOverview from '@/components/cms/SearchableOverview'
import SearchConsoleStats from '@/components/cms/SearchConsoleStats'
import { cleanGaId, cleanGtmId, type AnalyticsIds } from '@/lib/analytics-ids'

/**
 * Onglet « Visibilité SEO & IA » : tout ce qui mesure et améliore la façon dont le site est trouvé,
 * par Google (Search Console), par les assistants IA (Searchable, llms.txt) et par la mesure d'audience
 * (Tag Manager / GA4), réunis sur un seul écran.
 */

const card: React.CSSProperties = { background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
const btn: React.CSSProperties = { padding: '.45rem .9rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const btnPrimary: React.CSSProperties = { ...btn, background: '#2d5f54', color: 'white' }
const label: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#555', marginBottom: '.25rem' }
const input: React.CSSProperties = { width: '100%', padding: '.55rem .75rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.9rem', boxSizing: 'border-box' }

const SOURCE_LABEL: Record<string, string> = { cms: 'réglé ici', vercel: 'réglé dans Vercel', default: 'identifiant d’origine du site' }

type AnalyticsPayload = { active: AnalyticsIds; custom: { gtm_id: string; ga_id: string } }

function AnalyticsCard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [gtm, setGtm] = useState('')
  const [ga, setGa] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/cms/analytics', { cache: 'no-store' })
    if (!res.ok) return
    const d = (await res.json()) as AnalyticsPayload
    setData(d); setGtm(d.custom.gtm_id); setGa(d.custom.ga_id)
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { void load() }, [load])

  async function save() {
    setMsg(null)
    if (gtm.trim() && !cleanGtmId(gtm)) { setMsg({ ok: false, text: 'Identifiant Tag Manager invalide : il ressemble à GTM-ABC1234.' }); return }
    if (ga.trim() && !cleanGaId(ga)) { setMsg({ ok: false, text: 'Identifiant Google Analytics invalide : il ressemble à G-ABC1234567.' }); return }
    setSaving(true)
    try {
      const res = await fetch('/api/cms/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ key: 'gtm_id', value: cleanGtmId(gtm) }, { key: 'ga_id', value: cleanGaId(ga) }] }),
      })
      if (!res.ok) { setMsg({ ok: false, text: 'Enregistrement impossible.' }); return }
      setMsg({ ok: true, text: 'Enregistré. Pris en compte au prochain chargement des pages (quelques minutes au plus).' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const row = (name: string, id: string, source: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '.86rem', padding: '.3rem 0', borderBottom: '1px solid #f2efeb' }}>
      <span>{name}</span>
      <span>{id ? <><code>{id}</code> <span style={{ color: '#999' }}>· {SOURCE_LABEL[source]}</span></> : <span style={{ color: '#b45309' }}>désactivé</span>}</span>
    </div>
  )

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 .75rem', fontSize: '1.05rem', color: '#2d5f54' }}>📈 Tag Manager &amp; Google Analytics</h3>
      {data && (<div style={{ marginBottom: '1rem' }}>
        {row('Google Tag Manager', data.active.gtm, data.active.gtmSource)}
        {row('Google Analytics 4', data.active.ga, data.active.gaSource)}
      </div>)}
      <p style={{ margin: '0 0 .9rem', fontSize: '.82rem', color: '#666', lineHeight: 1.5 }}>
        Ces outils ne se chargent <strong>qu’après l’acceptation des cookies</strong> par le visiteur (RGPD). Laissez un champ vide pour garder l’identifiant actuel.
        Ne branchez pas aussi GA4 dans Tag Manager : chaque visite serait comptée deux fois.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.9rem', marginBottom: '.9rem' }}>
        <div><label style={label} htmlFor="gtm-id">Identifiant Tag Manager</label><input id="gtm-id" style={input} disabled={!data} value={gtm} onChange={e => setGtm(e.target.value)} placeholder="GTM-XXXXXXX" spellCheck={false} /></div>
        <div><label style={label} htmlFor="ga-id">Identifiant de mesure GA4</label><input id="ga-id" style={input} disabled={!data} value={ga} onChange={e => setGa(e.target.value)} placeholder="G-XXXXXXXXXX" spellCheck={false} /></div>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={btnPrimary} onClick={() => void save()} disabled={saving || !data}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <a style={btn} href="https://tagmanager.google.com/" target="_blank" rel="noopener noreferrer">Ouvrir Tag Manager ↗</a>
        <a style={btn} href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Ouvrir Analytics ↗</a>
        {msg && <span style={{ fontSize: '.84rem', color: msg.ok ? '#1e7a4d' : '#b3261e' }}>{msg.text}</span>}
      </div>
    </div>
  )
}

const FILES = [
  { path: '/llms.txt', name: 'llms.txt', help: 'Résumé du site pour ChatGPT, Claude, Perplexity… (généré depuis vos pages, articles et FAQ).' },
  { path: '/robots.txt', name: 'robots.txt', help: 'Indique aux moteurs et aux robots d’IA ce qu’ils peuvent lire.' },
  { path: '/sitemap.xml', name: 'sitemap.xml', help: 'Liste de vos pages, envoyée à Google.' },
]

type FileState = 'checking' | 'ok' | 'ko'

function ReferencingCard({ onGoto }: { onGoto: (tab: string) => void }) {
  const [state, setState] = useState<Record<string, FileState>>({})
  useEffect(() => {
    let alive = true
    FILES.forEach(async f => {
      setState(s => ({ ...s, [f.path]: 'checking' }))
      try {
        const res = await fetch(f.path, { cache: 'no-store' })
        if (alive) setState(s => ({ ...s, [f.path]: res.ok ? 'ok' : 'ko' }))
      } catch {
        if (alive) setState(s => ({ ...s, [f.path]: 'ko' }))
      }
    })
    return () => { alive = false }
  }, [])

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 .75rem', fontSize: '1.05rem', color: '#2d5f54' }}>🧭 Référencement : Google et assistants IA</h3>
      {FILES.map(f => (
        <div key={f.path} style={{ display: 'flex', gap: '.75rem', alignItems: 'baseline', padding: '.4rem 0', borderBottom: '1px solid #f2efeb', fontSize: '.86rem' }}>
          <span style={{ width: '1.2rem' }}>{state[f.path] === 'ok' ? '✅' : state[f.path] === 'ko' ? '⚠️' : '…'}</span>
          <a href={f.path} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#2d5f54' }}>{f.name}</a>
          <span style={{ color: '#777' }}>{f.help}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button style={btn} onClick={() => onGoto('seo')}>🩺 Titres et descriptions par page</button>
        <button style={btn} onClick={() => onGoto('settings')}>⚙️ SEO global et visibilité des pages</button>
        <button style={btn} onClick={() => onGoto('contenu')}>🔎 Chercher un texte du site</button>
      </div>
    </div>
  )
}

export default function VisibilityTab({ onGoto }: { onGoto: (tab: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <h2 style={{ margin: '0 0 .3rem', fontSize: '1.3rem' }}>🔍 Visibilité SEO &amp; IA</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '.9rem' }}>Comment le site est trouvé, par Google comme par les assistants IA, et ce qu’il reste à améliorer.</p>
      </div>
      <SearchableOverview />
      <div style={card}><SearchConsoleStats /></div>
      <AnalyticsCard />
      <ReferencingCard onGoto={onGoto} />
    </div>
  )
}
