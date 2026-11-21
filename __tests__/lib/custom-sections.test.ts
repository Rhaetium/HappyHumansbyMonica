import { describe, it, expect } from 'vitest'
import {
  blankBlock, customSectionDefs, customSectionId, duplicateBlock, isCustomSectionId, makeId, moveBlock, parseBlocks,
  parseListLines, parseStatLines, removeBlock, serializeBlocks, splitForCustom, updateBlock, validFaqItems,
  type CustomBlock,
} from '@/lib/custom-sections'

describe('custom-sections', () => {
  it('parseBlocks tolère tout (vide, invalide, non-tableau)', () => {
    expect(parseBlocks('')).toEqual([])
    expect(parseBlocks(null)).toEqual([])
    expect(parseBlocks('{mauvais json')).toEqual([])
    expect(parseBlocks('{"a":1}')).toEqual([])
    expect(parseBlocks('[{"id":"x"}]')).toEqual([]) // sans type valide
  })

  it('parseBlocks garde les blocs valides', () => {
    const blocks = parseBlocks(JSON.stringify([{ id: 'a', type: 'texte', text: 'hello', align: 'left' }]))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ id: 'a', type: 'texte' })
  })

  it('serializeBlocks : vide → chaîne vide (retombe sur défauts)', () => {
    expect(serializeBlocks([])).toBe('')
    expect(parseBlocks(serializeBlocks([blankBlock('cta', 'x')]))).toHaveLength(1)
  })

  it('blankBlock fournit les défauts par gabarit', () => {
    expect(blankBlock('split', 's')).toMatchObject({ type: 'split', layout: 'image-right' })
    expect(blankBlock('cta', 'c')).toMatchObject({ href: '/contact' })
    expect(makeId()).toMatch(/^b[0-9a-z]+$/)
  })

  it('moveBlock déplace sans sortir des bornes', () => {
    const bs = [blankBlock('texte', 'a'), blankBlock('texte', 'b'), blankBlock('texte', 'c')]
    expect(moveBlock(bs, 'b', -1).map(b => b.id)).toEqual(['b', 'a', 'c'])
    expect(moveBlock(bs, 'a', -1).map(b => b.id)).toEqual(['a', 'b', 'c'])
    expect(moveBlock(bs, 'c', 1).map(b => b.id)).toEqual(['a', 'b', 'c'])
    expect(moveBlock(bs, 'zzz', 1)).toHaveLength(3)
  })

  it('removeBlock / updateBlock', () => {
    const bs = [blankBlock('texte', 'a'), blankBlock('image', 'b')]
    expect(removeBlock(bs, 'a').map(b => b.id)).toEqual(['b'])
    const up = updateBlock(bs, 'a', { text: 'nouveau' } as never)
    expect((up[0] as { text: string }).text).toBe('nouveau')
    expect((up[1] as { type: string }).type).toBe('image')
  })

  it('splitForCustom isole l’appel à l’action final', () => {
    expect(splitForCustom(['cta'], ['hero', 'x', 'cta'])).toEqual({ main: ['hero', 'x'], end: ['cta'] })
    expect(splitForCustom([], ['a', 'b'])).toEqual({ main: ['a', 'b'], end: [] })
  })

  it('customSectionDefs expose les blocs comme sections déplaçables', () => {
    const bs = [blankBlock('cta', 'x'), blankBlock('texte', 'y')]
    const defs = customSectionDefs(bs)
    expect(defs.map(d => d.id)).toEqual(['custom:x', 'custom:y'])
    expect(customSectionId('x')).toBe('custom:x')
    expect(isCustomSectionId('custom:x')).toBe(true)
    expect(isCustomSectionId('hero')).toBe(false)
    expect(defs[0].label).toContain('🧩')
  })
})

describe('blocs FAQ, liste et chiffres clés', () => {
  it('blankBlock fournit les défauts des nouveaux gabarits', () => {
    expect(blankBlock('faq', 'f')).toMatchObject({ type: 'faq', items: [{ q: '', a: '' }] })
    expect(blankBlock('liste', 'l')).toMatchObject({ type: 'liste', text: '' })
    expect(blankBlock('chiffres', 'c')).toMatchObject({ type: 'chiffres', text: '' })
  })

  it('parseBlocks accepte les nouveaux types et répare une FAQ sans liste', () => {
    const blocks = parseBlocks(JSON.stringify([
      { id: 'a', type: 'faq', items: [{ q: 'Q ?', a: 'R.' }] },
      { id: 'b', type: 'faq' },
      { id: 'c', type: 'liste', text: 'un\ndeux' },
      { id: 'd', type: 'chiffres', text: '10 ans | d\'expérience' },
    ]))
    expect(blocks.map(b => b.type)).toEqual(['faq', 'faq', 'liste', 'chiffres'])
    expect((blocks[1] as Extract<CustomBlock, { type: 'faq' }>).items).toEqual([])
  })

  it('validFaqItems ne garde que les questions complètes, nettoyées', () => {
    expect(validFaqItems([{ q: ' Q1 ', a: ' R1 ' }, { q: 'Q2', a: '' }, { q: '', a: 'R3' }, 'x', null, { q: 4, a: 5 }]))
      .toEqual([{ q: 'Q1', a: 'R1' }])
    expect(validFaqItems(undefined)).toEqual([])
    expect(validFaqItems('pas un tableau')).toEqual([])
  })

  it('parseListLines : un point par ligne, vides ignorés', () => {
    expect(parseListLines('  un \n\n deux\n')).toEqual(['un', 'deux'])
    expect(parseListLines(undefined)).toEqual([])
  })

  it('parseStatLines : « valeur | libellé », libellé facultatif', () => {
    expect(parseStatLines("10 ans | d'expérience\n5 pays|\n12 villes\n | sans valeur")).toEqual([
      { value: '10 ans', label: "d'expérience" },
      { value: '5 pays', label: '' },
      { value: '12 villes', label: '' },
    ])
  })

  it('duplicateBlock copie juste après, avec un nouvel id et sans partager les données', () => {
    const faq = { ...blankBlock('faq', 'f'), items: [{ q: 'Q', a: 'R' }] } as CustomBlock
    const bs = [blankBlock('texte', 'a'), faq, blankBlock('cta', 'z')]
    const out = duplicateBlock(bs, 'f', 'copie')
    expect(out.map(b => b.id)).toEqual(['a', 'f', 'copie', 'z'])
    ;(out[2] as Extract<CustomBlock, { type: 'faq' }>).items[0].q = 'modifiée'
    expect((out[1] as Extract<CustomBlock, { type: 'faq' }>).items[0].q).toBe('Q')
    expect(duplicateBlock(bs, 'inconnu')).toBe(bs)
  })

  it('les nouveaux blocs apparaissent dans la liste Structure', () => {
    const defs = customSectionDefs([{ ...blankBlock('faq', 'f'), title: 'Vos questions' } as CustomBlock, blankBlock('liste', 'l')])
    expect(defs[0].label).toContain('Vos questions')
    expect(defs.map(d => d.id)).toEqual(['custom:f', 'custom:l'])
  })
})
