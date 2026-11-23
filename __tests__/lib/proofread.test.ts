import { describe, it, expect } from 'vitest'
import { applyCorrections, parseCorrections } from '@/lib/proofread'

const html = '<h2>Un titre</h2><p>Je vous recomande <a href="/recomande">ce guide</a> pour mieu dormir.</p>'
const reply = (c: unknown) => JSON.stringify({ corrections: c })

describe('parseCorrections', () => {
  it('garde une correction dont le texte fautif existe vraiment dans le texte', () => {
    const r = parseCorrections(reply([{ from: 'recomande', to: 'recommande', reason: 'double m' }]), html)
    expect(r).toEqual([{ from: 'recomande', to: 'recommande', reason: 'double m' }])
  })
  it('ignore texte introuvable, identique, trop différent, balise ou doublon', () => {
    const r = parseCorrections(reply([
      { from: 'introuvable', to: 'x' },
      { from: 'mieu', to: 'mieu' },
      { from: 'Je vous recomande', to: 'Je vous recommande vivement ce guide très complet' },
      { from: 'mieu', to: '<b>mieux</b>' },
      { from: 'mieu', to: 'mieux' },
      { from: 'mieu', to: 'mieux' },
    ]), html)
    expect(r.map(c => c.to)).toEqual(['mieux'])
  })
  it('un mot présent seulement dans une adresse n’est pas une correction possible', () => {
    expect(parseCorrections(reply([{ from: '/recomande', to: '/recommande' }]), html)).toEqual([])
  })
  it('réponse illisible : aucune correction', () => {
    expect(parseCorrections('désolé', html)).toEqual([])
    expect(parseCorrections('{"corrections":"non"}', html)).toEqual([])
  })
})

describe('applyCorrections', () => {
  it('corrige le texte sans toucher aux balises ni aux adresses', () => {
    const out = applyCorrections(html, [{ from: 'recomande', to: 'recommande', reason: '' }, { from: 'mieu', to: 'mieux', reason: '' }])
    expect(out.applied).toBe(2)
    expect(out.html).toContain('Je vous recommande <a href="/recomande">')
    expect(out.html).toContain('pour mieux dormir.')
  })
  it('ne compte pas une correction qui ne s’applique pas', () => {
    expect(applyCorrections(html, [{ from: 'absent', to: 'x', reason: '' }])).toEqual({ html, applied: 0 })
  })
})
