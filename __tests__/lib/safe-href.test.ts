import { describe, it, expect } from 'vitest'
import { isExternalHref, safeHref } from '@/lib/safe-href'

describe('safeHref', () => {
  const FB = '/booking'
  it('accepte une page du site, une ancre, https, mailto, tel', () => {
    expect(safeHref('/coaching', FB)).toBe('/coaching')
    expect(safeHref('  /booking?from=coaching ', FB)).toBe('/booking?from=coaching')
    expect(safeHref('#contact', FB)).toBe('#contact')
    expect(safeHref('https://calendly.com/exemple/30min', FB)).toBe('https://calendly.com/exemple/30min')
    expect(safeHref('mailto:bonjour@exemple.fr', FB)).toBe('mailto:bonjour@exemple.fr')
    expect(safeHref('tel:+41 79 123 45 67', FB)).toBe('tel:+41 79 123 45 67')
  })
  it('retombe sur l’adresse d’origine si le champ est vide ou absent', () => {
    expect(safeHref('', FB)).toBe(FB)
    expect(safeHref('   ', FB)).toBe(FB)
    expect(safeHref(undefined, FB)).toBe(FB)
    expect(safeHref(null, FB)).toBe(FB)
  })
  it('refuse les formes dangereuses ou ambiguës', () => {
    expect(safeHref('javascript:alert(1)', FB)).toBe(FB)
    expect(safeHref('JaVaScRiPt:alert(1)', FB)).toBe(FB)
    expect(safeHref('data:text/html,<script>', FB)).toBe(FB)
    expect(safeHref('//autre-site.test', FB)).toBe(FB)
    expect(safeHref('http://pas-securise.test', FB)).toBe(FB)
    expect(safeHref('coaching', FB)).toBe(FB) // sans « / » : ambigu
    expect(safeHref('/a b', FB)).toBe(FB)
    expect(safeHref('/x"onclick="y', FB)).toBe(FB)
    expect(safeHref('/x\\y', FB)).toBe(FB)
  })
})

describe('isExternalHref', () => {
  it('seuls les liens https sortent du site', () => {
    expect(isExternalHref('https://exemple.test')).toBe(true)
    expect(isExternalHref('/coaching')).toBe(false)
    expect(isExternalHref('mailto:a@b.fr')).toBe(false)
  })
})
