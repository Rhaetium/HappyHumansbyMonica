import { describe, it, expect } from 'vitest'
import { DEFAULT_PERSON_JOB_TITLE,
  DEFAULT_PERSON_NAME,
  DEFAULT_SEO_KEYWORDS,
  parseKeywords, DEFAULT_LANGUAGES, languageNames, parseLanguages } from '@/lib/site-seo'

describe('parseKeywords', () => {
  it('découpe sur les virgules et retire les espaces', () => {
    expect(parseKeywords('coaching, dirigeant ,  Paris')).toEqual(['coaching', 'dirigeant', 'Paris'])
  })

  it('accepte aussi le retour à la ligne (saisie en colonne)', () => {
    expect(parseKeywords('coaching dirigeant\nphilo-coaching')).toEqual(['coaching dirigeant', 'philo-coaching'])
  })

  it('retombe sur les mots-clés par défaut quand la saisie est vide', () => {
    expect(parseKeywords('')).toEqual(DEFAULT_SEO_KEYWORDS)
    expect(parseKeywords('   ')).toEqual(DEFAULT_SEO_KEYWORDS)
    expect(parseKeywords(', ,')).toEqual(DEFAULT_SEO_KEYWORDS)
    expect(parseKeywords(null)).toEqual(DEFAULT_SEO_KEYWORDS)
    expect(parseKeywords(undefined)).toEqual(DEFAULT_SEO_KEYWORDS)
  })

  it('ne renvoie jamais d’entrée vide', () => {
    expect(parseKeywords('a,,b,')).toEqual(['a', 'b'])
  })
})

describe('valeurs de secours SEO', () => {
  it('sont non vides (le JSON-LD et les métadonnées en dépendent)', () => {
    expect(DEFAULT_PERSON_NAME.length).toBeGreaterThan(0)
    expect(DEFAULT_PERSON_JOB_TITLE.length).toBeGreaterThan(0)
    expect(DEFAULT_SEO_KEYWORDS.length).toBeGreaterThan(0)
    expect(DEFAULT_SEO_KEYWORDS.every(k => k.trim().length > 0)).toBe(true)
  })
})

describe('langues déclarées dans les données structurées', () => {
  it('lit des codes séparés par des virgules, espaces ou points-virgules', () => {
    expect(parseLanguages('fr, en, ro, de, es')).toEqual(['fr', 'en', 'ro', 'de', 'es'])
    expect(parseLanguages('FR; en  ro')).toEqual(['fr', 'en', 'ro'])
  })
  it('ignore les doublons et les entrées invalides', () => {
    expect(parseLanguages('fr, fr, english, e, 12, de')).toEqual(['fr', 'de'])
  })
  it('une saisie vide ou sans code valide retombe sur les langues par défaut', () => {
    expect(parseLanguages('')).toEqual(DEFAULT_LANGUAGES)
    expect(parseLanguages(undefined)).toEqual(DEFAULT_LANGUAGES)
    expect(parseLanguages('français, anglais')).toEqual(DEFAULT_LANGUAGES)
  })
  it('garde au plus douze langues', () => {
    const many = 'aa,ab,ac,ad,ae,af,ag,ah,ai,aj,ak,al,am,an'
    expect(parseLanguages(many)).toHaveLength(12)
  })
  it('languageNames : nom anglais, code inconnu conservé', () => {
    expect(languageNames(['fr', 'en', 'ro', 'de', 'es'])).toEqual(['French', 'English', 'Romanian', 'German', 'Spanish'])
    expect(languageNames(['xx'])).toEqual(['xx'])
  })
})
