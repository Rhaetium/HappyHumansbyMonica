import { describe, it, expect } from 'vitest'
import { ALT_MAX_CHARS, buildAltPrompt, cleanAlt } from '@/lib/alt-text'

describe('cleanAlt', () => {
  it('retire guillemets, étiquette et préfixe « Photo de », majuscule initiale', () => {
    expect(cleanAlt('« Une femme souriante assise à un bureau lumineux »')).toBe('Une femme souriante assise à un bureau lumineux')
    expect(cleanAlt('Texte alternatif : "photo de deux personnes qui discutent autour d\'un café"')).toBe('Deux personnes qui discutent autour d\'un café')
    expect(cleanAlt('Image de montagnes au lever du soleil')).toBe('Montagnes au lever du soleil')
  })
  it('garde la première ligne seulement', () => {
    expect(cleanAlt('\nUn chemin en forêt.\nAutre ligne inutile')).toBe('Un chemin en forêt.')
  })
  it('coupe au dernier mot entier avant la limite', () => {
    const long = 'mot '.repeat(60)
    const out = cleanAlt(long)
    expect(out.length).toBeLessThanOrEqual(ALT_MAX_CHARS)
    expect(out.endsWith(' ')).toBe(false)
    expect(out.endsWith('mot')).toBe(true)
  })
  it('réponse vide : chaîne vide', () => {
    expect(cleanAlt('  \n ')).toBe('')
  })
})

describe('buildAltPrompt', () => {
  it('ajoute le contexte, borné', () => {
    expect(buildAltPrompt('Atelier équipe')).toContain('Atelier équipe')
    expect(buildAltPrompt('x'.repeat(500)).length).toBeLessThan(400)
    expect(buildAltPrompt()).toBe('Décris cette image.')
  })
})
