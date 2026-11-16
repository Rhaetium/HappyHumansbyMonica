import { describe, it, expect } from 'vitest'
import { buildLlmsTxt, truncate } from '@/lib/llms-txt'

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
