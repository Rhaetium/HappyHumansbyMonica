import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PERSON_JOB_TITLE,
  DEFAULT_PERSON_NAME,
  DEFAULT_SEO_KEYWORDS,
  parseKeywords,
} from '@/lib/site-seo'

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
