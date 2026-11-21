import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CustomSections from '@/components/CustomSections'

const render = (blocks: unknown[]) => renderToStaticMarkup(<CustomSections blocksJson={JSON.stringify(blocks)} />)

describe('rendu des blocs FAQ, liste et chiffres clés', () => {
  it('FAQ : les réponses sont dans le HTML et la question est déclarée en FAQPage', () => {
    const html = render([{ id: 'f', type: 'faq', title: 'Vos questions', items: [
      { q: 'Combien coûte une séance ?', a: 'La séance découverte est gratuite.' },
      { q: 'Question sans réponse', a: '' },
    ] }])
    expect(html).toContain('Vos questions')
    expect(html).toContain('Combien coûte une séance ?')
    expect(html).toContain('La séance découverte est gratuite.') // lisible sans clic
    expect(html).toContain('<details')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('FAQPage')
    expect(html).not.toContain('Question sans réponse')
  })

  it('FAQ : le JSON-LD ne peut pas fermer la balise script (texte hostile)', () => {
    const html = render([{ id: 'f', type: 'faq', items: [{ q: 'Q', a: 'x</script><script>alert(1)</script>' }] }])
    const ld = html.slice(html.indexOf('application/ld+json'))
    expect(ld.indexOf('</script>')).toBe(ld.lastIndexOf('</script>')) // une seule fermeture : la bonne
    expect(ld).not.toContain('<script>alert')
  })

  it('FAQ vide : rien n\'est affiché', () => {
    expect(render([{ id: 'f', type: 'faq', items: [] }])).toBe('')
    expect(render([{ id: 'f', type: 'faq' }])).toBe('')
  })

  it('liste : un point par ligne', () => {
    const html = render([{ id: 'l', type: 'liste', title: 'Pour qui ?', text: 'Managers\n\nDirigeants' }])
    expect(html).toContain('Pour qui ?')
    expect(html.match(/<li/g)).toHaveLength(2)
    expect(render([{ id: 'l', type: 'liste', text: '  \n ' }])).toBe('')
  })

  it('chiffres clés : valeur et libellé', () => {
    const html = render([{ id: 'c', type: 'chiffres', text: "10 ans | d'expérience\n5 pays" }])
    expect(html).toContain('10 ans')
    expect(html).toContain('d&#x27;expérience')
    expect(html).toContain('5 pays')
    expect(html.match(/<dt/g)).toHaveLength(2)
  })

  it('le texte saisi est échappé (pas de HTML injecté)', () => {
    const html = render([{ id: 'l', type: 'liste', text: '<img src=x onerror=alert(1)>' }])
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})
