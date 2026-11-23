'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { buildPriorities } from '@/lib/priorities'
import type { SeoIssue } from '@/lib/seo-audit'
import type { ArticleAuditResult } from '@/lib/article-audit'

/**
 * « Vos priorités » du tableau de bord : les 10 corrections les plus utiles pour être mieux trouvée
 * (titres et descriptions des pages, articles). Les alertes de santé du site ont déjà leur bloc en haut
 * de page avec leur correction : on ne les répète pas ici.
 */
export default function PrioritiesCard({ seoIssues, onGoto }: { seoIssues: SeoIssue[]; onGoto: (tab: string) => void }) {
  const [articles, setArticles] = useState<ArticleAuditResult[] | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/cms/articles-audit', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('audit'))))
      .then((d: { results: ArticleAuditResult[] }) => { if (alive) setArticles(d.results) })
      .catch(() => { if (alive) setArticles([]) })
    return () => { alive = false }
  }, [])

  const priorities = useMemo(
    () => buildPriorities({ health: [], seo: seoIssues, articles: articles ?? [] }),
    [seoIssues, articles],
  )

  if (articles === null) return null
  return (
    <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1.5rem' }}>
      <h2 style={{ margin: '0 0 .3rem', fontSize: '1.05rem', color: '#2d5f54' }}>🎯 Vos priorités pour être mieux trouvée</h2>
      {priorities.length === 0 ? (
        <p style={{ margin: '.4rem 0 0', fontSize: '.9rem' }}>✅ Rien d’urgent : les titres, descriptions et articles sont en ordre.</p>
      ) : (
        <>
          <p style={{ margin: '0 0 .6rem', color: '#777', fontSize: '.84rem' }}>
            Les plus utiles d’abord. Corrigez-en quelques-unes par semaine : la liste se met à jour toute seule.
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.3rem' }}>
            {priorities.map(p => (
              <li key={p.id} style={{ padding: '.45rem 0', fontSize: '.88rem', borderBottom: '1px solid #f2efeb' }}>
                <span style={{ fontWeight: 700, color: p.level === 'error' ? '#991b1b' : '#1e3a34' }}>{p.title}</span>
                <span style={{ display: 'block', color: '#666', marginTop: '.15rem' }}>{p.detail}</span>
                {p.tab && (
                  <button
                    onClick={() => onGoto(p.tab!)}
                    style={{ marginTop: '.3rem', padding: '.25rem .7rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.78rem', cursor: 'pointer' }}
                  >
                    {p.tab === 'seo' ? 'Corriger les titres et descriptions' : 'Ouvrir les articles'}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
