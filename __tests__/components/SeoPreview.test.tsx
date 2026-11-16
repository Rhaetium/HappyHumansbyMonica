import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SeoPreview from '@/components/cms/SeoPreview'

const site = 'https://exemple.test'
const html = (props: { title: string; description: string; path: string }) =>
  renderToStaticMarkup(<SeoPreview {...props} siteUrl={site} />)

describe('SeoPreview', () => {
  it('montre le titre avec la marque, l’adresse et la description', () => {
    const out = html({ title: 'Contact — Monica Schneider', description: 'Écrivez à Monica.', path: '/contact' })
    expect(out).toContain('Contact — Monica Schneider | Happy Humans')
    expect(out).toContain('exemple.test › contact')
    expect(out).toContain('Écrivez à Monica.')
  })

  it('ne double pas la marque déjà saisie dans le titre', () => {
    const out = html({ title: 'Questions fréquentes — Happy Humans', description: 'x', path: '/faq' })
    expect(out).toContain('Questions fréquentes | Happy Humans')
    expect(out).not.toMatch(/Happy Humans.*Happy Humans/)
  })

  it('coupe un titre et une description trop longs avec « … »', () => {
    const out = html({ title: 'T'.repeat(80), description: 'd'.repeat(200), path: '/' })
    expect(out.match(/…/g)).toHaveLength(2)
    expect(out).not.toContain('T'.repeat(80))
    expect(out).not.toContain('d'.repeat(200))
  })

  it('explique quand il n’y a ni titre ni description', () => {
    const out = html({ title: '', description: '', path: '/booking' })
    expect(out).toContain('Titre de la page')
    expect(out).toContain('Aucune description')
  })
})
