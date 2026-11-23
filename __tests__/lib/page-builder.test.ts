import { describe, it, expect } from 'vitest'
import { blockSummary, buildPageBuilderPrompt, parsePageProposal, MAX_BLOCKS } from '@/lib/page-builder'

const reply = (o: unknown) => JSON.stringify(o)

describe('parsePageProposal', () => {
  const good = {
    title: 'Atelier équipe', intro: 'Un atelier pour souder votre équipe.', seoTitle: 'Atelier équipe | Happy Humans', seoDescription: 'Description.',
    blocks: [
      { type: 'texte', title: 'Pour qui ?', text: 'Pour les équipes.', align: 'center' },
      { type: 'cartes', title: 'Au programme', text: '🌱 | Écoute | Prendre le temps' },
      { type: 'faq', title: 'Questions', items: [{ q: 'Combien de personnes ?', a: '[à compléter]' }, { q: 'Sans réponse', a: '' }] },
      { type: 'cta', title: 'On en parle ?', button: 'Me contacter', href: '/contact' },
    ],
  }

  it('crée une page HORS LIGNE avec des blocs valides et un identifiant par bloc', () => {
    const r = parsePageProposal(reply(good))!
    expect(r.page.published).toBe(false)
    expect(r.page.slug).toBe('atelier-equipe')
    expect(r.page.blocks.map(b => b.type)).toEqual(['texte', 'cartes', 'faq', 'cta'])
    expect(new Set(r.page.blocks.map(b => b.id)).size).toBe(4)
    const faq = r.page.blocks[2]
    expect(faq.type === 'faq' && faq.items).toEqual([{ q: 'Combien de personnes ?', a: '[à compléter]' }])
  })

  it('accepte une réponse entourée d’un bloc de code', () => {
    expect(parsePageProposal('Voici :\n```json\n' + reply(good) + '\n```')).not.toBeNull()
  })

  it('retire les blocs qui demandent de vraies données (témoignages, chiffres, citation, vidéo, image) et le dit', () => {
    const r = parsePageProposal(reply({ ...good, blocks: [
      ...good.blocks,
      { type: 'temoignages', text: 'Super ! | Julie' },
      { type: 'chiffres', text: '98 % | satisfaits' },
      { type: 'image', image: 'https://x/y.jpg' },
    ] }))!
    expect(r.page.blocks.map(b => b.type)).not.toContain('temoignages')
    expect(r.page.blocks.map(b => b.type)).not.toContain('chiffres')
    expect(r.notes.filter(n => n.includes('retiré'))).toHaveLength(3)
  })

  it('ne laisse passer aucune image ni lien hors de la liste du site', () => {
    const r = parsePageProposal(reply({ title: 'T', blocks: [
      { type: 'split', title: 'A', text: 'B', image: 'https://evil.example/x.png', ctaLabel: 'Go', ctaHref: 'https://evil.example' },
      { type: 'cta', title: 'C', button: 'Cliquez', href: 'https://evil.example' },
      { type: 'bouton', label: 'Réserver', href: '/booking/' },
    ] }))!
    const [split, cta, bouton] = r.page.blocks
    expect(split.type === 'split' && split.image).toBe('')
    expect(split.type === 'split' && split.ctaHref).toBeUndefined()
    expect(cta.type === 'cta' && cta.href).toBe('/contact')
    expect(bouton.type === 'bouton' && bouton.href).toBe('/booking')
    expect(r.notes.some(n => n.includes('adresse inconnue'))).toBe(true)
  })

  it('borne le nombre de blocs et la longueur des textes', () => {
    const many = Array.from({ length: 20 }, () => ({ type: 'texte', text: 'x'.repeat(5000) }))
    const r = parsePageProposal(reply({ title: 'T', blocks: many }))!
    expect(r.page.blocks).toHaveLength(MAX_BLOCKS)
    const first = r.page.blocks[0]
    expect(first.type === 'texte' && first.text.length).toBe(2000)
  })

  it('réponse illisible ou sans bloc exploitable : null', () => {
    expect(parsePageProposal('désolé')).toBeNull()
    expect(parsePageProposal(reply({ title: 'T', blocks: [{ type: 'texte', text: '' }, { type: 'inconnu' }] }))).toBeNull()
  })
})

describe('prompt et résumé', () => {
  it('le prompt contient la description', () => {
    expect(buildPageBuilderPrompt('Une page atelier')).toContain('Une page atelier')
  })
  it('résume chaque bloc en une ligne', () => {
    expect(blockSummary({ id: 'a', type: 'bouton', label: 'Réserver', href: '/booking', align: 'center' })).toBe('Bouton « Réserver »')
    expect(blockSummary({ id: 'a', type: 'faq', items: [{ q: 'q', a: 'a' }], title: 'FAQ' })).toBe('Questions fréquentes (1) — FAQ')
  })
})
