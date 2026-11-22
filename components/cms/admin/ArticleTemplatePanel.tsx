'use client'

import React from 'react'
import { ARTICLE_TEMPLATE_HTML, checkArticle } from '@/lib/article-template'

/**
 * Gabarit « une question, un article » pour l'éditeur d'article : bouton d'insertion du modèle et liste de contrôle
 * recalculée à chaque frappe. C'est un guide : aucun point ne bloque l'enregistrement ni la publication.
 */
const btn: React.CSSProperties = { padding: '.45rem .9rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }

export default function ArticleTemplatePanel({
  title, slug, content, description, onChangeContent,
}: {
  title: string
  slug: string
  content: string
  description: string
  onChangeContent: (html: string) => void
}) {
  const checks = checkArticle({ title, slug, html: content, description })
  const done = checks.filter(c => c.ok).length
  const empty = !content.trim()

  const insert = () => {
    if (!empty && !window.confirm('Le modèle sera ajouté à la fin de votre texte. Continuer ?')) return
    onChangeContent(empty ? ARTICLE_TEMPLATE_HTML : `${content}\n${ARTICLE_TEMPLATE_HTML}`)
  }

  return (
    <details open={empty || done < checks.length} style={{ border: '1.5px solid #e8e3dc', borderRadius: '.75rem', background: '#fafaf8', padding: '.75rem 1rem', marginBottom: '.75rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '.88rem', color: '#2d5f54' }}>
        📐 Gabarit « une question, un article » <span style={{ fontWeight: 600, color: done === checks.length ? '#15803d' : '#a16207' }}>· {done}/{checks.length}</span>
      </summary>
      <p style={{ fontSize: '.8rem', color: '#666', lineHeight: 1.5, margin: '.6rem 0' }}>
        Les moteurs de recherche et les assistants IA citent les pages qui répondent à une question précise. Le titre est la question, les premiers mots y répondent,
        trois intertitres détaillent, une FAQ conclut. Ce guide ne bloque rien.
      </p>
      <button type="button" style={btn} onClick={insert}>📐 Insérer le modèle « Question → réponse »</button>
      <ul style={{ listStyle: 'none', margin: '.8rem 0 0', padding: 0, display: 'grid', gap: '.35rem' }}>
        {checks.map(c => (
          <li key={c.id} style={{ fontSize: '.82rem' }}>
            <span aria-hidden style={{ color: c.ok ? '#15803d' : '#a16207', marginRight: '.4rem' }}>{c.ok ? '✓' : '○'}</span>
            <span style={{ color: c.ok ? '#44403c' : '#1c1917', fontWeight: c.ok ? 400 : 600 }}>{c.label}</span>
            {!c.ok && <span style={{ display: 'block', marginLeft: '1.1rem', color: '#78716c', fontSize: '.76rem' }}>{c.hint}</span>}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: '.76rem', color: '#78716c', margin: '.7rem 0 0' }}>
        La section « Questions fréquentes » est déclarée automatiquement à Google. La date de mise à jour s’affiche toute seule sur l’article.
      </p>
    </details>
  )
}
