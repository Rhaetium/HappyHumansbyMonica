import { describe, it, expect } from 'vitest'
import { PAGE_TEMPLATES, pageFromTemplate, placeholders, templateById } from '@/lib/page-templates'
import { isValidSlug, parsePages, serializePages, blankPage, type CustomPage } from '@/lib/custom-pages'
import { parseBlocks, serializeBlocks, validFaqItems } from '@/lib/custom-sections'

describe('modèles de pages', () => {
  it('ids et adresses uniques et valides', () => {
    const ids = PAGE_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of PAGE_TEMPLATES) expect(isValidSlug(t.slug), t.id).toBe(true)
    expect(ids).toContain('vierge')
  })
  it('chaque page créée est hors ligne, avec ses propres identifiants', () => {
    for (const t of PAGE_TEMPLATES) {
      const page = pageFromTemplate([], t.id)
      expect(page.published).toBe(false)
      const ids = page.blocks.map(b => b.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every(Boolean)).toBe(true)
    }
    const a = pageFromTemplate([], 'offre'), b = pageFromTemplate([], 'offre')
    expect(a.id).not.toBe(b.id)
    expect(a.blocks[0].id).not.toBe(b.blocks[0].id)
  })
  it('les blocs survivent à l’enregistrement (aucun bloc perdu à la relecture)', () => {
    for (const t of PAGE_TEMPLATES) {
      const page = pageFromTemplate([], t.id)
      expect(parseBlocks(serializeBlocks(page.blocks))).toHaveLength(page.blocks.length)
      const back = parsePages(serializePages([page]))
      expect(back, t.id).toHaveLength(1)
      expect(back[0].blocks).toHaveLength(page.blocks.length)
    }
  })
  it('les FAQ des modèles sont lisibles (3 questions chacune)', () => {
    for (const t of PAGE_TEMPLATES) for (const b of t.blocks) if (b.type === 'faq') expect(validFaqItems(b.items)).toHaveLength(3)
  })
  it('adresse déjà prise : un numéro est ajouté', () => {
    const existing: CustomPage[] = [{ ...blankPage([]), slug: 'tarifs' }]
    expect(pageFromTemplate(existing, 'tarifs').slug).toBe('tarifs-2')
  })
  it('modèle inconnu ou vierge : page vierge', () => {
    expect(pageFromTemplate([], 'nimporte').blocks).toEqual([])
    expect(pageFromTemplate([], 'vierge').title).toBe('Nouvelle page')
  })
  it('le modèle n’est jamais modifié par la page créée', () => {
    const page = pageFromTemplate([], 'offre')
    const faq = page.blocks.find(b => b.type === 'faq')
    if (faq && faq.type === 'faq') faq.items[0].q = 'modifié'
    const tpl = templateById('offre')!.blocks.find(b => b.type === 'faq')
    expect(tpl && tpl.type === 'faq' && tpl.items[0].q).toBe('Combien ça coûte ?')
  })
  it('le seul tarif chiffré est celui publié (120 €) ; aucun autre montant inventé', () => {
    const text = JSON.stringify(PAGE_TEMPLATES)
    const amounts = [...text.matchAll(/(\d[\d  .]*)\s?€/g)].map(m => m[1].replace(/\s/g, ''))
    expect(new Set(amounts)).toEqual(new Set(['120', '0']))
  })
})

describe('placeholders', () => {
  it('trouve les [crochets] dans titre, accroche, SEO et blocs (y compris FAQ)', () => {
    expect(placeholders(pageFromTemplate([], 'vierge'))).toEqual([])
    const offre = placeholders(pageFromTemplate([], 'offre'))
    expect(offre.length).toBeGreaterThan(8)
    expect(offre).toContain('[Nom de l’offre]')
    expect(offre).toContain('[Question fréquente 3]')
  })
  it('une page remplie n’a plus d’alerte', () => {
    const page = { ...pageFromTemplate([], 'vierge'), title: 'Ma page', intro: 'Bonjour' }
    expect(placeholders(page)).toEqual([])
  })
})
