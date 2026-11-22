import { describe, it, expect } from 'vitest'
import { buildLlmsTxt, truncate, offerLink, priceLabel } from '@/lib/llms-txt'

const base = {
  siteName: 'Happy Humans',
  summary: 'Philo-coaching avec **Monica Schneider**.',
  pages: [
    { title: 'Coaching individuel', url: 'https://x.test/coaching', description: 'Un accompagnement *sur mesure*.' },
    { title: 'FAQ', url: 'https://x.test/faq' },
  ],
  posts: [{ title: 'Mon article', url: 'https://x.test/blog/mon-article', description: 'Résumé.' }],
  faq: [{ q: 'Comment réserver ?', a: 'Sur la page **réservation**.' }],
}

describe('buildLlmsTxt', () => {
  it('suit le format llms.txt : titre, résumé en citation, sections de liens', () => {
    const t = buildLlmsTxt(base)
    const lines = t.split('\n')
    expect(lines[0]).toBe('# Happy Humans')
    expect(lines[2]).toBe('> Philo-coaching avec Monica Schneider.')
    expect(t).toContain('## Pages principales')
    expect(t).toContain('- [Coaching individuel](https://x.test/coaching): Un accompagnement sur mesure.')
    expect(t).toContain('- [FAQ](https://x.test/faq)\n')
    expect(t).toContain('## Articles du blog')
    expect(t).toContain('## Questions fréquentes')
    expect(t).toContain('- **Comment réserver ?** Sur la page réservation.')
    expect(t.endsWith('\n')).toBe(true)
    expect(t).not.toMatch(/\n{3,}/)
  })

  it('n’affiche pas de section vide', () => {
    const t = buildLlmsTxt({ ...base, posts: [], faq: [] })
    expect(t).not.toContain('Articles du blog')
    expect(t).not.toContain('Questions fréquentes')
  })

  it('retire les crochets d’un titre pour ne pas casser le lien Markdown', () => {
    const t = buildLlmsTxt({ ...base, pages: [{ title: 'Offre [promo] 2026', url: 'https://x.test/o' }] })
    expect(t).toContain('- [Offre promo 2026](https://x.test/o)')
  })

  it('ignore une page sans titre ou sans adresse', () => {
    const t = buildLlmsTxt({ ...base, pages: [{ title: '  ', url: 'https://x.test/a' }, { title: 'Sans adresse', url: '' }] })
    expect(t).not.toContain('Pages principales')
  })

  it('limite le nombre d’articles et la longueur des réponses', () => {
    const posts = Array.from({ length: 50 }, (_, i) => ({ title: `Article ${i}`, url: `https://x.test/b/${i}` }))
    const t = buildLlmsTxt({ ...base, posts, faq: [{ q: 'Long ?', a: 'mot '.repeat(500) }] })
    expect((t.match(/^- \[Article/gm) ?? []).length).toBe(20)
    const faqLine = t.split('\n').find(l => l.startsWith('- **Long ?**'))!
    expect(faqLine.length).toBeLessThan(330)
    expect(faqLine.endsWith('…')).toBe(true)
  })
})

describe('truncate', () => {
  it('ne touche pas un texte court', () => {
    expect(truncate('court', 50)).toBe('court')
  })
  it('coupe à la limite d’un mot et ajoute « … »', () => {
    expect(truncate('un deux trois quatre cinq six sept', 20)).toBe('un deux trois…')
  })
})

describe('offres et tarifs dans /llms.txt', () => {
  it('priceLabel : « Gratuit » et « Sur devis » en minuscules, un prix reste tel quel, rien = vide', () => {
    expect(priceLabel('Gratuit')).toBe('gratuit')
    expect(priceLabel(' Sur devis ')).toBe('sur devis')
    expect(priceLabel('120 €')).toBe('120 €')
    expect(priceLabel(undefined)).toBe('')
  })
  it('offerLink : nom, description puis tarif (avec durée entre parenthèses)', () => {
    expect(offerLink({ name: 'Séance individuelle', desc: 'Séance ponctuelle pour un sujet précis.', price: '120 €', unit: '60 min' }, 'https://x.fr/coaching'))
      .toEqual({ title: 'Séance individuelle', url: 'https://x.fr/coaching', description: 'Séance ponctuelle pour un sujet précis. Tarif : 120 € (60 min).' })
  })
  it('offerLink : sans prix, aucun tarif inventé ; sans nom, ignorée', () => {
    expect(offerLink({ name: 'Conférence', desc: 'Atelier.' }, 'u')!.description).toBe('Atelier.')
    expect(offerLink({ name: '  ', price: '10 €' }, 'u')).toBeNull()
    expect(offerLink({ name: 'Seul' }, 'u')).toEqual({ title: 'Seul', url: 'u', description: undefined })
  })
  it('la section « Offres et tarifs » apparaît entre les pages et les articles, et seulement s\'il y a des offres', () => {
    const base = { siteName: 'Happy Humans', summary: 'Résumé.', pages: [{ title: 'Accueil', url: 'https://x.fr/' }], posts: [{ title: 'Article', url: 'https://x.fr/blog/a' }], faq: [] }
    const withOffers = buildLlmsTxt({ ...base, offers: [{ title: 'Séance découverte', url: 'https://x.fr/coaching', description: 'Premier échange. Tarif : gratuit.' }] })
    expect(withOffers).toContain('## Offres et tarifs')
    expect(withOffers).toContain('- [Séance découverte](https://x.fr/coaching): Premier échange. Tarif : gratuit.')
    expect(withOffers.indexOf('## Pages principales')).toBeLessThan(withOffers.indexOf('## Offres et tarifs'))
    expect(withOffers.indexOf('## Offres et tarifs')).toBeLessThan(withOffers.indexOf('## Articles du blog'))
    expect(buildLlmsTxt({ ...base, offers: [] })).not.toContain('Offres et tarifs')
    expect(buildLlmsTxt(base)).not.toContain('Offres et tarifs')
  })
})
