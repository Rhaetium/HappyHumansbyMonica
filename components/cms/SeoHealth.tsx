'use client'

import { actionableCount, type SeoIssue, type SeoLevel } from '@/lib/seo-audit'

const LEVEL_STYLE: Record<SeoLevel, { icon: string; label: string; color: string; bg: string; border: string }> = {
  error:   { icon: '⛔', label: 'À corriger',      color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  warning: { icon: '⚠️', label: 'À améliorer',     color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  info:    { icon: 'ℹ️', label: 'Pour information', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
}

/**
 * Onglet « 🩺 Référencement » : ce que Google voit de chaque page (titre, description, image de partage),
 * avec ce qu'il faut corriger et un bouton qui ouvre directement le bon champ. Lecture seule.
 */
export default function SeoHealth({
  issues,
  pageCount,
  onOpen,
}: {
  issues: SeoIssue[]
  pageCount: number
  onOpen: (issue: SeoIssue) => void
}) {
  const todo = actionableCount(issues)
  const summary =
    todo === 0
      ? { icon: '✅', text: 'Tout est en ordre', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' }
      : { icon: '🩺', text: `${todo} point${todo > 1 ? 's' : ''} à regarder`, color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' }

  const groups = (['error', 'warning', 'info'] as SeoLevel[])
    .map(level => ({ level, items: issues.filter(i => i.level === level) }))
    .filter(g => g.items.length > 0)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ padding: '1.2rem 1.4rem', background: summary.bg, border: `1px solid ${summary.border}`, borderRadius: '.8rem', marginBottom: '1.2rem' }}>
        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: summary.color }}>
          {summary.icon} {summary.text}
        </p>
        <p style={{ margin: '.35rem 0 0', fontSize: '.85rem', color: '#555' }}>
          {pageCount} page{pageCount > 1 ? 's' : ''} contrôlée{pageCount > 1 ? 's' : ''} d’après ce qui est <strong>publié</strong> (ce que voit Google). Les
          brouillons ne comptent pas tant qu’ils ne sont pas publiés.
        </p>
      </div>

      {groups.map(({ level, items }) => {
        const s = LEVEL_STYLE[level]
        return (
          <section key={level} style={{ marginBottom: '1.4rem' }}>
            <h3 style={{ margin: '0 0 .6rem', fontSize: '.9rem', color: s.color }}>
              {s.icon} {s.label} ({items.length})
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.5rem' }}>
              {items.map((issue, i) => (
                <li
                  key={`${issue.page}-${issue.field}-${i}`}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '.6rem' }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '.78rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{issue.label}</p>
                    <p style={{ margin: '.2rem 0 0', fontSize: '.88rem', color: '#333' }}>{issue.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpen(issue)}
                    style={{ flexShrink: 0, padding: '.45rem .9rem', background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', borderRadius: '.45rem', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer' }}
                  >
                    {issue.field === 'visibility' ? 'Ouvrir les réglages' : 'Corriger'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
