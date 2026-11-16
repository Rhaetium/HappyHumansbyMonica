import { describe, expect, it } from 'vitest'
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults'
import { BRAND_NAME, DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE, stripBrandSuffix } from '@/lib/site-seo'

// Google coupe les titres vers 60 caractères et les descriptions vers 160.
const TITLE_MAX = 60
const DESC_MAX = 160
const DESC_MIN = 70
const TEMPLATE = ` | ${BRAND_NAME}` // ajouté par le gabarit du site à chaque titre de page

// Pages publiques du sitemap (hors accueil, vérifié à part)
const PAGES = [
  'a-propos', 'coaching', 'entreprises', 'happiness-design', 'sparring-partner', 'relations',
  'booking', 'contact', 'blog', 'faq', 'mentions-legales', 'politique-confidentialite',
]

describe('stripBrandSuffix', () => {
  it('retire la marque en fin de titre, quel que soit le séparateur', () => {
    expect(stripBrandSuffix('Contact — Monica Schneider · Happy Humans')).toBe('Contact — Monica Schneider')
    expect(stripBrandSuffix('Questions fréquentes — Happy Humans')).toBe('Questions fréquentes')
    expect(stripBrandSuffix('Coaching | Happy Humans')).toBe('Coaching')
    expect(stripBrandSuffix('Coaching - happy humans')).toBe('Coaching')
  })

  it('laisse intact un titre sans marque finale', () => {
    expect(stripBrandSuffix('Coaching individuel & philo-coaching')).toBe('Coaching individuel & philo-coaching')
    expect(stripBrandSuffix('Happy Humans — Coaching')).toBe('Happy Humans — Coaching')
  })

  it('ne renvoie jamais un titre vide', () => {
    expect(stripBrandSuffix('Happy Humans')).toBe('Happy Humans')
    expect(stripBrandSuffix('')).toBe('')
    expect(stripBrandSuffix(undefined)).toBe('')
  })
})

describe('titres et descriptions des pages (valeurs par défaut)', () => {
  it.each(PAGES)('%s : titre ≤ 60 caractères (marque comprise), sans marque en double', page => {
    const raw = PAGE_DEFAULTS[page]?.seo_title
    expect(raw, `seo_title manquant pour ${page}`).toBeTruthy()
    const title = stripBrandSuffix(raw)
    expect(title + TEMPLATE).not.toMatch(/Happy Humans.*Happy Humans/i)
    expect((title + TEMPLATE).length, `${page} : « ${title}${TEMPLATE} »`).toBeLessThanOrEqual(TITLE_MAX)
  })

  it.each(PAGES)('%s : description entre 70 et 160 caractères', page => {
    const d = PAGE_DEFAULTS[page]?.seo_description ?? ''
    expect(d.length, `${page} : ${d.length} caractères`).toBeGreaterThanOrEqual(DESC_MIN)
    expect(d.length, `${page} : ${d.length} caractères`).toBeLessThanOrEqual(DESC_MAX)
  })

  it('accueil : titre et description dans les limites', () => {
    expect(DEFAULT_SITE_TITLE.length).toBeLessThanOrEqual(TITLE_MAX)
    expect(DEFAULT_SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(DESC_MIN)
    expect(DEFAULT_SITE_DESCRIPTION.length).toBeLessThanOrEqual(DESC_MAX)
  })

  it('chaque page a un titre différent (pas de doublon entre pages)', () => {
    const titles = PAGES.map(p => stripBrandSuffix(PAGE_DEFAULTS[p]?.seo_title).toLowerCase())
    expect(new Set(titles).size).toBe(titles.length)
  })
})
