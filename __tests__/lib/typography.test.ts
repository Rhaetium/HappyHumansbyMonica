import { describe, it, expect } from 'vitest'
import { FONT_CHOICES, resolveTheme, googleFontsHref } from '@/lib/themes'
import {
  DEFAULT_TYPO_TEMPLATE, TYPO_SETTING_KEYS, TYPO_TEMPLATES, buildTypographyCSS, resolveTypography, templateById,
} from '@/lib/typography'

describe('gabarits de style', () => {
  it('ids uniques, gabarit par défaut présent, polices existantes', () => {
    const ids = TYPO_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(DEFAULT_TYPO_TEMPLATE)
    for (const t of TYPO_TEMPLATES) {
      expect(FONT_CHOICES.some(f => f.id === t.settings.fontHeading)).toBe(true)
      expect(FONT_CHOICES.some(f => f.id === t.settings.fontBody)).toBe(true)
      expect(t.label.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(20)
    }
  })
  it('le gabarit par défaut est lisible : texte non fin, interligne aéré', () => {
    const s = templateById(undefined).settings
    expect(Number(s.weight)).toBeGreaterThanOrEqual(400)
    expect(Number(s.lineHeight)).toBeGreaterThanOrEqual(1.65)
    expect(s.size).not.toBe('normal')
  })
  it('gabarit inconnu : repli sur le défaut', () => {
    expect(templateById('nimporte').id).toBe(DEFAULT_TYPO_TEMPLATE)
  })
})

describe('resolveTypography', () => {
  it('sans réglage : gabarit par défaut', () => {
    const r = resolveTypography({})
    expect(r.template).toBe(DEFAULT_TYPO_TEMPLATE)
    expect(r.settings).toEqual(templateById(DEFAULT_TYPO_TEMPLATE).settings)
  })
  it('le gabarit choisi s’applique, les réglages individuels le surchargent', () => {
    const r = resolveTypography({ theme_typo: 'classique', theme_text_weight: '500', theme_font_body: 'nunito' })
    expect(r.template).toBe('classique')
    expect(r.settings.weight).toBe('500')
    expect(r.settings.fontBody).toBe('nunito')
    expect(r.settings.fontHeading).toBe('cormorant') // vient du gabarit
  })
  it('valeurs vides ou invalides : valeur du gabarit', () => {
    const r = resolveTypography({ theme_typo: 'sobre', theme_text_size: '', theme_line_height: '9', theme_caps: 'x', theme_heading_weight: '<script>' })
    expect(r.settings).toEqual(templateById('sobre').settings)
  })
  it('toutes les clés lues sont déclarées', () => {
    expect(TYPO_SETTING_KEYS).toContain('theme_typo')
    expect(TYPO_SETTING_KEYS).toContain('theme_font_body')
  })
})

describe('buildTypographyCSS', () => {
  it('taille, graisses et interligne', () => {
    const css = buildTypographyCSS({ ...templateById('humain').settings, size: 'grand', weight: '500', lineHeight: '1.8', headingWeight: '700' })
    expect(css).toContain('font-size: 112.5%')
    expect(css).toContain('font-weight: 500 !important')
    expect(css).toContain('line-height: 1.8')
    expect(css).toMatch(/h1, h2[^}]*font-weight: 700/)
    expect(css).toContain('.font-light')
  })
  it('casse normale seulement si demandé', () => {
    expect(buildTypographyCSS({ ...templateById('humain').settings, caps: 'soft' })).toContain('text-transform: none')
    expect(buildTypographyCSS({ ...templateById('classique').settings })).not.toContain('text-transform')
  })
})

describe('polices chargées selon le gabarit', () => {
  it('Nunito et Lora (gabarit chaleureux) sont demandées à Google Fonts', () => {
    const s = resolveTypography({}).settings
    const { tokens } = resolveTheme('forest', { fontHeading: s.fontHeading, fontBody: s.fontBody })
    const href = googleFontsHref(tokens)
    expect(href).toContain('family=Nunito')
    expect(href).toContain('family=Lora')
  })
})

import { cleanFontFamily, customFamilyOf, customFontsHref, fontStack } from '@/lib/themes'

describe('police Google libre', () => {
  it('nettoie le nom saisi et refuse tout ce qui n’est pas un nom de police', () => {
    expect(cleanFontFamily('  Playfair   Display ')).toBe('Playfair Display')
    for (const bad of ['', 'a', '1abc', 'x;}body{display:none', "Arial'", '<b>', 'a'.repeat(41), 'Font&family=Evil']) {
      expect(cleanFontFamily(bad), bad).toBe('')
    }
  })
  it('le nom libre prime sur la liste et sur le gabarit', () => {
    const r = resolveTypography({ theme_typo: 'sobre', theme_font_body: 'nunito', theme_font_body_custom: 'Libre Baskerville' })
    expect(r.settings.fontBody).toBe('google:Libre Baskerville')
    expect(fontStack(r.settings.fontBody, 'x')).toBe("'Libre Baskerville', system-ui, sans-serif")
    expect(customFamilyOf(r.settings.fontBody)).toBe('Libre Baskerville')
  })
  it('un nom libre invalide est ignoré', () => {
    expect(resolveTypography({ theme_typo: 'sobre', theme_font_body_custom: 'x;}' }).settings.fontBody).toBe('dm-sans')
  })
  it('feuille Google séparée, seulement pour les polices libres', () => {
    expect(customFontsHref(['lora', 'nunito'])).toBeNull()
    const href = customFontsHref(['google:Libre Baskerville', 'google:Libre Baskerville', 'lora'])!
    expect(href).toBe('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@300;400;500;600;700&display=swap')
  })
  it('les nouvelles polices du catalogue sont chargeables', () => {
    for (const id of ['merriweather', 'source-serif', 'fraunces', 'work-sans', 'open-sans', 'raleway', 'josefin', 'caveat']) {
      expect(FONT_CHOICES.find(f => f.id === id)?.google, id).toBeTruthy()
    }
  })
  it('tailles petite et très grande', () => {
    expect(buildTypographyCSS({ ...templateById('humain').settings, size: 'tres-grand' })).toContain('font-size: 125%')
    expect(buildTypographyCSS({ ...templateById('humain').settings, size: 'petit' })).toContain('font-size: 93.75%')
  })
})
