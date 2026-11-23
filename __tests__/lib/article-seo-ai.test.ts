import { describe, it, expect } from 'vitest'
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, buildArticleSeoPrompt, fitLength, parseArticleSeoResponse, plainText } from '@/lib/article-seo-ai'

describe('plainText', () => {
  it('retire balises, scripts et entités, garde les sauts de paragraphe', () => {
    const t = plainText('<h2>Titre</h2><p>Un&nbsp;texte <strong>fort</strong> &amp; simple.</p><script>alert(1)</script>')
    expect(t).toContain('Titre')
    expect(t).toContain('Un texte fort & simple.')
    expect(t).not.toContain('alert')
    expect(t).not.toContain('<')
  })
  it('tronque', () => {
    expect(plainText('<p>' + 'a'.repeat(10000) + '</p>').length).toBe(4000)
  })
})

describe('buildArticleSeoPrompt', () => {
  it('contient le titre, la catégorie et le texte', () => {
    const p = buildArticleSeoPrompt('Mieux dormir', '<p>Dormir est essentiel.</p>', 'Bien-être')
    expect(p).toContain('Mieux dormir')
    expect(p).toContain('Bien-être')
    expect(p).toContain('Dormir est essentiel.')
  })
})

describe('fitLength', () => {
  it('ne touche pas un texte assez court', () => {
    expect(fitLength('Court et net', 60)).toBe('Court et net')
  })
  it('coupe au dernier mot entier, sans ponctuation finale', () => {
    const out = fitLength('Apprendre à dire non sans culpabiliser ni se justifier à chaque fois, avec douceur', 40)
    expect(out.length).toBeLessThanOrEqual(40)
    expect(out).toBe('Apprendre à dire non sans culpabiliser')
  })
})

describe('parseArticleSeoResponse', () => {
  it('lit un JSON, même dans un bloc de code, et enlève les guillemets', () => {
    const raw = '```json\n{"seo_title":"« Dire non avec douceur »","seo_description":"Trois gestes simples.","excerpt":"Une accroche."}\n```'
    expect(parseArticleSeoResponse(raw)).toEqual({ seo_title: 'Dire non avec douceur', seo_description: 'Trois gestes simples.', excerpt: 'Une accroche.' })
  })
  it('met les textes trop longs à la bonne taille', () => {
    const long = 'mot '.repeat(80)
    const r = parseArticleSeoResponse(JSON.stringify({ seo_title: long, seo_description: long, excerpt: 'ok' }))!
    expect(r.seo_title.length).toBeLessThanOrEqual(SEO_TITLE_MAX)
    expect(r.seo_description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX)
  })
  it('réponse illisible ou vide : null', () => {
    expect(parseArticleSeoResponse('désolé')).toBeNull()
    expect(parseArticleSeoResponse('{"seo_title":"","seo_description":"","excerpt":""}')).toBeNull()
  })
})
