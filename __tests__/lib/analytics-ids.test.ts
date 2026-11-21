import { describe, it, expect } from 'vitest'
import { DEFAULT_GA_ID, DEFAULT_GTM_ID, cleanGaId, cleanGtmId, resolveAnalyticsIds, resolveFromEnvironment } from '@/lib/analytics-ids'

describe('cleanGtmId / cleanGaId', () => {
  it('met en majuscules et retire les espaces', () => {
    expect(cleanGtmId('  gtm-abcd1234 ')).toBe('GTM-ABCD1234')
    expect(cleanGaId('g-abcdef1234')).toBe('G-ABCDEF1234')
  })
  it("refuse une valeur invalide (jamais d'identifiant douteux chargé)", () => {
    expect(cleanGtmId('UA-12345-1')).toBe('')
    expect(cleanGtmId('GTM-')).toBe('')
    expect(cleanGtmId('<script>')).toBe('')
    expect(cleanGaId('GTM-ABCD')).toBe('')
    expect(cleanGaId(undefined)).toBe('')
  })
})

describe('resolveAnalyticsIds', () => {
  const defaults = { gtm: 'GTM-DEFAULT1', ga: 'G-DEFAULT123' }
  it("le CMS passe avant Vercel, qui passe avant la valeur d'origine", () => {
    expect(resolveAnalyticsIds({ gtm_id: 'GTM-AAAA111', ga_id: 'G-BBBBBB22' }, { gtm: 'GTM-VERCEL1', ga: 'G-VERCEL11' }, defaults))
      .toMatchObject({ gtm: 'GTM-AAAA111', gtmSource: 'cms', ga: 'G-BBBBBB22', gaSource: 'cms' })
    expect(resolveAnalyticsIds({}, { gtm: 'GTM-VERCEL1', ga: 'G-VERCEL11' }, defaults))
      .toMatchObject({ gtm: 'GTM-VERCEL1', gtmSource: 'vercel', ga: 'G-VERCEL11', gaSource: 'vercel' })
    expect(resolveAnalyticsIds({}, {}, defaults))
      .toMatchObject({ gtm: 'GTM-DEFAULT1', gtmSource: 'default', ga: 'G-DEFAULT123', gaSource: 'default' })
  })
  it('une valeur CMS invalide est ignorée, pas appliquée', () => {
    expect(resolveAnalyticsIds({ gtm_id: "n'importe quoi", ga_id: '' }, {}, defaults))
      .toMatchObject({ gtm: 'GTM-DEFAULT1', gtmSource: 'default', ga: 'G-DEFAULT123', gaSource: 'default' })
  })
})

describe('resolveFromEnvironment (serveur)', () => {
  it("garde les identifiants d'origine quand rien n'est réglé", () => {
    expect(resolveFromEnvironment({}, {})).toMatchObject({ gtm: DEFAULT_GTM_ID, ga: DEFAULT_GA_ID, gtmSource: 'default', gaSource: 'default' })
  })
  it('une variable Vercel DÉFINIE mais vide désactive la mesure (comportement d\'origine)', () => {
    expect(resolveFromEnvironment({}, { NEXT_PUBLIC_GTM_ID: '', NEXT_PUBLIC_GA_ID: '' })).toMatchObject({ gtm: '', ga: '' })
  })
  it('le réglage de l\'admin repasse devant, même si Vercel a désactivé', () => {
    expect(resolveFromEnvironment({ gtm_id: 'gtm-abcd1234' }, { NEXT_PUBLIC_GTM_ID: '' })).toMatchObject({ gtm: 'GTM-ABCD1234', gtmSource: 'cms' })
  })
  it('une variable Vercel valide passe avant les identifiants d\'origine', () => {
    expect(resolveFromEnvironment({}, { NEXT_PUBLIC_GA_ID: 'G-VERCEL1234' })).toMatchObject({ ga: 'G-VERCEL1234', gaSource: 'vercel' })
  })
})
