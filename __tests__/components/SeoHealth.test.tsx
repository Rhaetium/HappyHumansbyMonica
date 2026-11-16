import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SeoHealth from '@/components/cms/SeoHealth'
import type { SeoIssue } from '@/lib/seo-audit'

const issue = (over: Partial<SeoIssue>): SeoIssue => ({
  page: 'coaching',
  label: 'Coaching',
  field: 'seo_title',
  level: 'warning',
  message: 'Titre trop long',
  ...over,
})

const html = (issues: SeoIssue[], pageCount = 12) =>
  renderToStaticMarkup(<SeoHealth issues={issues} pageCount={pageCount} onOpen={() => {}} />)

describe('SeoHealth', () => {
  it('félicite quand rien n’est à corriger', () => {
    const out = html([])
    expect(out).toContain('Tout est en ordre')
    expect(out).toContain('12 pages contrôlées')
  })

  it('compte les points à regarder sans compter les informations', () => {
    const out = html([issue({ level: 'error' }), issue({ level: 'warning' }), issue({ level: 'info', field: 'seo_image', message: 'Pas d’image' })])
    expect(out).toContain('2 points à regarder')
    expect(out).toContain('À corriger (1)')
    expect(out).toContain('À améliorer (1)')
    expect(out).toContain('Pour information (1)')
  })

  it('affiche le nom de la page, le message et un bouton « Corriger »', () => {
    const out = html([issue({ message: 'Titre trop long (72 caractères)' })])
    expect(out).toContain('Coaching')
    expect(out).toContain('Titre trop long (72 caractères)')
    expect(out).toContain('Corriger')
  })

  it('propose « Ouvrir les réglages » pour une page cachée à Google', () => {
    const out = html([issue({ level: 'info', field: 'visibility', message: 'Page cachée' })])
    expect(out).toContain('Ouvrir les réglages')
  })

  it('accorde le singulier', () => {
    expect(html([issue({})], 1)).toContain('1 point à regarder')
    expect(html([issue({})], 1)).toContain('1 page contrôlée')
  })
})
