'use client'

import { SERP_DESCRIPTION_MAX, SERP_TITLE_MAX, serpBreadcrumb, serpTitle, truncateForSerp } from '@/lib/seo-preview'

/**
 * Aperçu « résultat Google » : montre à Monica, en direct, comment sa page apparaîtra dans la recherche
 * (titre bleu, adresse, description), avec la marque ajoutée par le site et la coupure de Google.
 * Purement indicatif : ne modifie rien.
 */
export default function SeoPreview({
  title,
  description,
  siteUrl,
  path,
}: {
  title: string
  description: string
  siteUrl: string
  path: string
}) {
  const fullTitle = serpTitle(title)
  const shownTitle = truncateForSerp(fullTitle, SERP_TITLE_MAX)
  const shownDescription = truncateForSerp(description, SERP_DESCRIPTION_MAX)

  return (
    <div
      aria-label="Aperçu du résultat Google"
      style={{ marginTop: '.75rem', padding: '.9rem 1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '.6rem', maxWidth: 640 }}
    >
      <p style={{ margin: '0 0 .5rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9ca3af' }}>
        Aperçu dans Google
      </p>
      <p style={{ margin: 0, fontSize: '.8rem', color: '#4d5156', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {serpBreadcrumb(siteUrl, path)}
      </p>
      <p style={{ margin: '.15rem 0 0', fontSize: '1.15rem', lineHeight: 1.3, color: shownTitle ? '#1a0dab' : '#9ca3af' }}>
        {shownTitle || 'Titre de la page'}
      </p>
      <p style={{ margin: '.3rem 0 0', fontSize: '.85rem', lineHeight: 1.5, color: shownDescription ? '#4d5156' : '#9ca3af' }}>
        {shownDescription || 'Aucune description : Google en choisira une lui-même dans le texte de la page.'}
      </p>
    </div>
  )
}
