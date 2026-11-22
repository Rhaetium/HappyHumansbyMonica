import { describe, it, expect } from 'vitest'
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults'

/**
 * Garde-fou : la description Google par défaut de chaque page reste lisible en entier dans les résultats
 * (158 caractères au plus) et assez longue pour donner envie de cliquer (70 au moins).
 */
describe('descriptions Google par défaut', () => {
  const pages = Object.entries(PAGE_DEFAULTS).filter(([, d]) => (d as Record<string, string>).seo_description)
  it('il y a des pages à vérifier', () => { expect(pages.length).toBeGreaterThan(8) })
  it.each(pages)('« %s » : entre 70 et 158 caractères', (_page, d) => {
    const n = ((d as Record<string, string>).seo_description || '').trim().length
    expect(n).toBeGreaterThanOrEqual(70)
    expect(n).toBeLessThanOrEqual(158)
  })
})
