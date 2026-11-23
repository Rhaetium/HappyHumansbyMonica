import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CustomSections from '@/components/CustomSections'
import { blankBlock, parseBlocks, serializeBlocks } from '@/lib/custom-sections'

const render = (blocks: unknown[]) => renderToStaticMarkup(<CustomSections blocksJson={JSON.stringify(blocks)} />)

describe('nouveaux blocs', () => {
  it('cartes : titre, emoji et texte de chaque carte', () => {
    const html = render([{ id: 'c', type: 'cartes', title: 'Mes atouts', text: '🌱 | Écoute | Un espace pour vous\nClarté | Voir plus net' }])
    expect(html).toContain('Mes atouts')
    expect(html).toContain('Écoute')
    expect(html).toContain('Un espace pour vous')
    expect(html).toContain('Clarté')
  })

  it('témoignages : texte et auteur, rien d’inventé', () => {
    const html = render([{ id: 't', type: 'temoignages', text: 'Très utile | Julie, dirigeante' }])
    expect(html).toContain('Très utile')
    expect(html).toContain('Julie, dirigeante')
  })

  it('vidéo : lecteur youtube-nocookie ; adresse non reconnue : rien', () => {
    const html = render([{ id: 'v', type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Ma vidéo' }])
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(html).toContain('<iframe')
    expect(render([{ id: 'v', type: 'video', url: 'https://evil.example/x' }])).toBe('')
    expect(render([{ id: 'v', type: 'video', url: 'javascript:alert(1)' }])).toBe('')
  })

  it('bouton seul, et rien s’il manque le texte ou le lien', () => {
    expect(render([{ id: 'b', type: 'bouton', label: 'Réserver', href: '/booking', align: 'center' }])).toContain('Réserver')
    expect(render([{ id: 'b', type: 'bouton', label: '', href: '/booking', align: 'center' }])).toBe('')
  })

  it('espace : un bloc vide de hauteur choisie', () => {
    expect(render([{ id: 'e', type: 'espace', size: 'grand' }])).toContain('h-24')
  })

  it('blocs vides : rien n’est affiché', () => {
    expect(render([{ id: 'c', type: 'cartes', text: '' }, { id: 't', type: 'temoignages', text: '  ' }])).toBe('')
  })
})

describe('réglages avancés', () => {
  const base = { id: 'x', type: 'texte', text: 'Bonjour', align: 'left' }

  it('sans réglage : le HTML est celui du bloc seul (aucune enveloppe)', () => {
    expect(render([base]).startsWith('<section')).toBe(true)
  })

  it('ancre, fond, espacement et masquage sont appliqués sur une enveloppe', () => {
    const html = render([{ ...base, style: { bg: 'sombre', space: 'ample', anchor: 'Mes Tarifs', hideMobile: true } }])
    expect(html.startsWith('<div id="mes-tarifs"')).toBe(true)
    expect(html).toContain('bg-stone-900')
    expect(html).toContain('!py-20')
    expect(html).toContain('max-md:hidden')
    expect(html).toContain('Bonjour')
  })

  it('un bloc masqué ou vide ne laisse pas d’enveloppe orpheline', () => {
    expect(render([{ id: 'c', type: 'cartes', text: '', style: { anchor: 'vide' } }])).toBe('')
  })

  it('valeurs inconnues ou hostiles ignorées', () => {
    const html = render([{ ...base, style: { bg: 'rouge" onload="x', anchor: '"><script>alert(1)</script>', space: 'géant' } }])
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onload')
  })

  it('aller-retour : le style est conservé à l’enregistrement et relu proprement', () => {
    const b = { ...blankBlock('texte', 'a'), style: { bg: 'creme' as const, anchor: 'intro' } }
    const back = parseBlocks(serializeBlocks([b]))
    expect(back[0].style).toEqual({ bg: 'creme', anchor: 'intro' })
  })

  it('les nouveaux types se créent vides', () => {
    expect(blankBlock('video', 'v')).toMatchObject({ type: 'video', url: '' })
    expect(blankBlock('espace', 'e')).toMatchObject({ size: 'moyen' })
  })
})
