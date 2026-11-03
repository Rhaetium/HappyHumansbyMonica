'use client'

import React, { useCallback, useEffect, useState } from 'react'

/**
 * Statistiques Google Search Console (niveau 2).
 *
 * Trois états, du plus courant au moins :
 *  - « non connecté » : le compte de service n'est pas encore installé (guide pas à pas) ;
 *  - erreur : Google a refusé (compte de service absent de la propriété, adresse inexacte) ;
 *  - chiffres : clics, impressions, position, principales requêtes et pages.
 *
 * Les données viennent de `/api/cms/search-console/stats`, jamais de Google directement :
 * la clé privée reste sur le serveur.
 */

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
type GscStats = {
  period: { startDate: string; endDate: string; days: number }
  totals: { clicks: number; impressions: number; ctr: number; position: number }
  topQueries: GscRow[]
  topPages: GscRow[]
}

const PERIODS = [
  { days: 7, label: '7 jours' },
  { days: 28, label: '28 jours' },
  { days: 90, label: '3 mois' },
]

const card: React.CSSProperties = {
  background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
}
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#aaa',
  textTransform: 'uppercase', letterSpacing: '.05em', padding: '.5rem .6rem',
  borderBottom: '1.5px solid #ece8e2', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '.55rem .6rem', fontSize: '.86rem', color: '#333',
  borderBottom: '1px solid #f2efeb', verticalAlign: 'top',
}

const nf = new Intl.NumberFormat('fr-FR')
/** Pourcentage, 1 décimale (0,4 % est plus lisible que 0,42 %). */
const pct = (v: number) => `${(v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
/** Position moyenne : une décimale suffit (2,3). */
const pos = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
/** Chemin court pour les URL de page. */
function shortPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? '/' : u.pathname
  } catch {
    return url
  }
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>{label}</p>
      <p style={{ fontSize: '1.9rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>{value}</p>
      {hint && <p style={{ fontSize: '.75rem', color: '#999', margin: '.3rem 0 0' }}>{hint}</p>}
    </div>
  )
}

function RowTable({ title, firstColumn, rows, renderKey }: {
  title: string
  firstColumn: string
  rows: GscRow[]
  renderKey: (r: GscRow) => string
}) {
  return (
    <div style={{ ...card, padding: '1.25rem 1rem' }}>
      <p style={{ fontSize: '.8rem', fontWeight: 700, color: '#2d5f54', margin: '0 0 .75rem', paddingLeft: '.6rem' }}>{title}</p>
      {rows.length === 0 ? (
        <p style={{ fontSize: '.85rem', color: '#999', margin: 0, paddingLeft: '.6rem' }}>
          Aucune donnée sur cette période.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{firstColumn}</th>
                <th style={{ ...th, textAlign: 'right' }}>Clics</th>
                <th style={{ ...th, textAlign: 'right' }}>Impressions</th>
                <th style={{ ...th, textAlign: 'right' }}>Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, maxWidth: 320, wordBreak: 'break-word' }}>{renderKey(r)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{nf.format(r.clicks)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#666' }}>{nf.format(r.impressions)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#666' }}>{pos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SetupGuide({ siteUrl }: { siteUrl: string }) {
  return (
    <div style={{ padding: '1.5rem', background: '#f7faf9', border: '1.5px solid #d7e5e0', borderRadius: '1rem' }}>
      <p style={{ margin: '0 0 .5rem', fontSize: '1rem', fontWeight: 700, color: '#2d5f54' }}>
        📊 Statistiques Google non connectées
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '.88rem', color: '#555', lineHeight: 1.6 }}>
        Le site sait déjà vérifier la propriété, mais lire les chiffres (recherches, clics) demande
        un accès supplémentaire. Voici comment le mettre en place, une seule fois.
      </p>
      <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '.88rem', color: '#444', lineHeight: 1.8 }}>
        <li>Ouvrez <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" style={{ color: '#2d5f54', fontWeight: 600 }}>Google Cloud → Comptes de service</a> et créez-en un.</li>
        <li>Créez une clé <strong>JSON</strong> pour ce compte, puis copiez son adresse e-mail et sa clé privée.</li>
        <li>Dans <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: '#2d5f54', fontWeight: 600 }}>Search Console</a> → Paramètres → Utilisateurs et autorisations, ajoutez cette adresse e-mail en <strong>lecture</strong> sur la propriété <code style={{ background: '#ece8e2', padding: '.1rem .35rem', borderRadius: '.25rem' }}>{siteUrl}</code>.</li>
        <li>Dans Vercel → Settings → Environment Variables, ajoutez <code style={{ background: '#ece8e2', padding: '.1rem .35rem', borderRadius: '.25rem' }}>GSC_SERVICE_ACCOUNT_EMAIL</code> et <code style={{ background: '#ece8e2', padding: '.1rem .35rem', borderRadius: '.25rem' }}>GSC_SERVICE_ACCOUNT_PRIVATE_KEY</code>, puis redéployez.</li>
      </ol>
      <p style={{ margin: '1rem 0 0', fontSize: '.82rem', color: '#666', lineHeight: 1.5 }}>
        Tant que ces deux variables manquent, cet onglet reste ici sans rien casser : le site
        fonctionne normalement.
      </p>
    </div>
  )
}

export default function SearchConsoleStats() {
  const [days, setDays] = useState(28)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [stats, setStats] = useState<GscStats | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetch(`/api/cms/search-console/stats?days=${days}`, { cache: 'no-store' })
      if (res.status === 401) { setError('Session expirée : reconnectez-vous à l’administration.'); return }
      const data = await res.json().catch(() => ({}))
      if (data.siteUrl) setSiteUrl(data.siteUrl)
      if (!res.ok) {
        setConfigured(true)
        setError(data.error || `Erreur ${res.status}`)
        setHint(data.hint || null)
        return
      }
      setConfigured(Boolean(data.configured))
      setStats(data.configured ? data.stats : null)
    } catch {
      setConfigured(true)
      setError('Impossible de joindre le serveur.')
    } finally {
      setLoading(false)
    }
  }, [days])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { void load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>🔎 Statistiques Google</h2>
          <p style={{ fontSize: '.85rem', color: '#888', margin: '.3rem 0 0' }}>
            Ce que les gens tapent dans Google pour arriver sur le site.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              style={{
                padding: '.45rem .9rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${days === p.days ? '#2d5f54' : '#ddd'}`,
                borderRadius: '.5rem', background: days === p.days ? '#2d5f54' : 'white',
                color: days === p.days ? 'white' : '#555',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ fontSize: '.9rem', color: '#888' }}>Chargement des statistiques…</p>}

      {!loading && configured === false && <SetupGuide siteUrl={siteUrl || 'https://happyhumans.vercel.app/'} />}

      {!loading && error && (
        <div style={{ padding: '1.25rem 1.5rem', background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: '1rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>🚨 {error}</p>
          {hint && <p style={{ margin: '.5rem 0 0', fontSize: '.86rem', color: '#555', lineHeight: 1.5 }}>{hint}</p>}
          <button onClick={() => void load()} style={{ marginTop: '.75rem', padding: '.45rem .9rem', fontSize: '.82rem', fontWeight: 600, background: 'white', border: '1.5px solid #fecaca', borderRadius: '.5rem', cursor: 'pointer', color: '#991b1b' }}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && configured && !error && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '.8rem', color: '#999', margin: 0 }}>
            Période : du {stats.period.startDate} au {stats.period.endDate}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            <Kpi label="Clics" value={nf.format(stats.totals.clicks)} />
            <Kpi label="Impressions" value={nf.format(stats.totals.impressions)} />
            <Kpi label="Taux de clics" value={pct(stats.totals.ctr)} hint="clics ÷ impressions" />
            <Kpi label="Position moyenne" value={pos(stats.totals.position)} hint="1 = première place" />
          </div>
          <RowTable title="Principales recherches" firstColumn="Recherche" rows={stats.topQueries} renderKey={r => r.keys[0] ?? '—'} />
          <RowTable title="Pages les plus vues dans Google" firstColumn="Page" rows={stats.topPages} renderKey={r => shortPath(r.keys[0] ?? '')} />
        </div>
      )}
    </div>
  )
}
