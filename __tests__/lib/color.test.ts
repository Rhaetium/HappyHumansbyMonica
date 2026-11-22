import { describe, it, expect } from 'vitest'
import { duotoneTables, hexToUnit } from '@/lib/color'

describe('hexToUnit', () => {
  it('convertit un hexadécimal en valeurs 0 à 1', () => {
    expect(hexToUnit('#000000')).toEqual([0, 0, 0])
    expect(hexToUnit('#ffffff')).toEqual([1, 1, 1])
    expect(hexToUnit('#1e3a34')).toEqual([0.118, 0.227, 0.204])
  })
  it('accepte la forme courte et l’absence de #', () => {
    expect(hexToUnit('#fff')).toEqual([1, 1, 1])
    expect(hexToUnit('c9a96e')).toEqual([0.788, 0.663, 0.431])
  })
  it('refuse ce qui n’est pas une couleur', () => {
    expect(hexToUnit('')).toBeNull()
    expect(hexToUnit(undefined)).toBeNull()
    expect(hexToUnit('rgb(1,2,3)')).toBeNull()
    expect(hexToUnit('#12345')).toBeNull()
    expect(hexToUnit('var(--hh-dark)')).toBeNull()
  })
})

describe('duotoneTables', () => {
  it('reproduit exactement le filtre d’origine (vert foncé et or)', () => {
    expect(duotoneTables('#1e3a34', '#c9a96e')).toEqual({ r: '0.118 0.788', g: '0.227 0.663', b: '0.204 0.431' })
  })
  it('null si une couleur est illisible', () => {
    expect(duotoneTables('x', '#fff')).toBeNull()
    expect(duotoneTables('#fff', '')).toBeNull()
  })
})
