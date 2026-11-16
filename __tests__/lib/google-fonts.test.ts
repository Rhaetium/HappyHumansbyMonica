import { describe, expect, it } from 'vitest'
import { FONT_CHOICES, THEMES, fontStack, googleFontsHref } from '@/lib/themes'

const families = (href: string) => [...href.matchAll(/family=([^:&]+)/g)].map(m => decodeURIComponent(m[1]).replace(/\+/g, ' '))

describe('googleFontsHref', () => {
  it('thème par défaut : seulement les polices de base (Cormorant, Inter, Playfair)', () => {
    expect(families(googleFontsHref(THEMES.forest)).sort()).toEqual(['Cormorant Garamond', 'Inter', 'Playfair Display'])
  })

  it('ne charge plus les 9 polices du CMS sur chaque page', () => {
    const href = googleFontsHref(THEMES.forest)
    for (const unused of ['Comfortaa', 'Montserrat', 'Quicksand', 'Nunito', 'Poppins', 'DM Sans', 'Lora']) {
      expect(href).not.toContain(unused.replace(' ', '+'))
    }
  })

  it('ajoute la police choisie dans le thème (titres et texte)', () => {
    const tokens = {
      ...THEMES.forest,
      fontHeading: fontStack('comfortaa', THEMES.forest.fontHeading),
      fontBody: fontStack('montserrat', THEMES.forest.fontBody),
    }
    const list = families(googleFontsHref(tokens))
    expect(list).toContain('Comfortaa')
    expect(list).toContain('Montserrat')
    expect(list).not.toContain('Poppins')
  })

  it('chaque thème fournit des polices que le site sait charger (aucune police sans feuille Google manquante)', () => {
    const loadable = new Set(FONT_CHOICES.filter(f => f.google).map(f => f.stack.split(',')[0].replace(/['"]/g, '').trim().toLowerCase()))
    const system = new Set(['georgia', 'system-ui', '-apple-system'])
    for (const [id, t] of Object.entries(THEMES)) {
      for (const stack of [t.fontHeading, t.fontBody]) {
        const first = stack.split(',')[0].replace(/['"]/g, '').trim().toLowerCase()
        expect(loadable.has(first) || system.has(first), `thème ${id} : police « ${first} » jamais chargée`).toBe(true)
      }
    }
  })

  it('la feuille commence par l’adresse Google Fonts et finit par display=swap', () => {
    const href = googleFontsHref(THEMES.forest)
    expect(href.startsWith('https://fonts.googleapis.com/css2?family=')).toBe(true)
    expect(href.endsWith('&display=swap')).toBe(true)
  })
})
