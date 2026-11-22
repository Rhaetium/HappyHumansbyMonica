import { describe, it, expect } from 'vitest'
import { PAGE_FAQS, defaultFaqSections } from '@/lib/cms-defaults/page-faqs'
import { parseBlocks, validFaqItems } from '@/lib/custom-sections'
import { COACHING_DEFAULTS } from '@/lib/cms-defaults/coaching'
import { ENTREPRISES_DEFAULTS } from '@/lib/cms-defaults/entreprises'
import { HAPPINESS_DESIGN_DEFAULTS } from '@/lib/cms-defaults/happiness-design'
import { RELATIONS_DEFAULTS } from '@/lib/cms-defaults/relations'
import { SPARRING_PARTNER_DEFAULTS } from '@/lib/cms-defaults/sparring-partner'

const DEFAULTS: Record<string, Record<string, string>> = {
  coaching: COACHING_DEFAULTS, entreprises: ENTREPRISES_DEFAULTS, relations: RELATIONS_DEFAULTS,
  'sparring-partner': SPARRING_PARTNER_DEFAULTS, 'happiness-design': HAPPINESS_DESIGN_DEFAULTS,
}

describe('FAQ par défaut des pages de prestation', () => {
  it.each(Object.keys(PAGE_FAQS))('« %s » : un bloc FAQ valide, trois questions complètes', (page) => {
    const blocks = parseBlocks(defaultFaqSections(page))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ type: 'faq', id: `faq-${page}` })
    const items = validFaqItems((blocks[0] as { items: unknown }).items)
    expect(items).toHaveLength(3)
    for (const it of items) { expect(it.q.endsWith('?')).toBe(true); expect(it.a.length).toBeGreaterThan(40) }
  })

  it('chaque page concernée a bien cette FAQ comme valeur par défaut de ses blocs', () => {
    for (const page of Object.keys(PAGE_FAQS)) expect(DEFAULTS[page].custom_sections, page).toBe(defaultFaqSections(page))
  })

  it('une page sans FAQ : chaîne vide (retombe sur « aucun bloc »)', () => {
    expect(defaultFaqSections('contact')).toBe('')
  })

  it('les identifiants de questions sont uniques dans une page', () => {
    for (const [page, items] of Object.entries(PAGE_FAQS)) expect(new Set(items.map(i => i.q)).size, page).toBe(items.length)
  })

  describe('cohérence avec ce que les pages affichent (si une page change, la FAQ doit suivre)', () => {
    const answer = (page: string, i: number) => PAGE_FAQS[page][i].a
    it('coaching : prix de la séance individuelle, séance découverte gratuite, programmes sur devis', () => {
      expect(answer('coaching', 0)).toContain(COACHING_DEFAULTS.program_2_price)
      expect(COACHING_DEFAULTS.program_1_price).toBe('Gratuit')
      expect(COACHING_DEFAULTS.program_3_price).toBe('Sur devis')
      expect(COACHING_DEFAULTS.program_4_price).toBe('Sur devis')
      expect(answer('coaching', 0).toLowerCase()).toContain('gratuite')
      expect(answer('coaching', 0).toLowerCase()).toContain('sur devis')
    })
    it('entreprises : Coaching Flash = 5 séances de 60 min, une toutes les deux semaines, sur devis', () => {
      expect(ENTREPRISES_DEFAULTS.flash_format).toBe('5 séances · 60 min')
      expect(ENTREPRISES_DEFAULTS.flash_rythme).toBe('1 séance / 2 semaines')
      expect(ENTREPRISES_DEFAULTS.flash_tarif).toBe('Sur devis')
      expect(answer('entreprises', 1)).toMatch(/5 séances de 60 minutes/)
      expect(answer('entreprises', 1).toLowerCase()).toContain('toutes les deux semaines')
      expect(ENTREPRISES_DEFAULTS.pricing_card_1_price).toBe('Sur devis')
      expect(ENTREPRISES_DEFAULTS.pricing_card_2_price).toBe('Sur devis')
    })
    it('happiness design : 12 séances et 4 suivis, comme sur la page', () => {
      expect(HAPPINESS_DESIGN_DEFAULTS.format_value).toBe('12 séances + 4 follow-ups')
      expect(answer('happiness-design', 2)).toMatch(/12 séances/)
      expect(answer('happiness-design', 2)).toMatch(/4 sessions de suivi/)
    })
    it('aucun montant en euros hors de ceux publiés sur les pages', () => {
      const all = Object.values(PAGE_FAQS).flat().map(i => i.a).join(' ')
      const amounts = all.match(/\d[\d\s]*\s?€/g) ?? []
      expect(amounts.map(a => a.replace(/\s/g, ''))).toEqual(['120€'])
    })
  })
})
