import { describe, it, expect } from 'vitest'
import {
  ARTICLE_TEMPLATE_HTML, FAQ_HEADING, checkArticle, directAnswer, extractFaq, shouldShowUpdated,
} from '@/lib/article-template'

const ANSWER = 'Un atelier de cohésion coûte entre 1 500 et 4 000 euros pour une équipe de dix personnes, selon sa durée et son format. Le prix dépend du diagnostic préalable, du nombre de participants et du suivi prévu après l’atelier ; un devis précis est établi après un premier échange gratuit.'

const GOOD = `
<p><strong>${ANSWER}</strong></p>
<h2>De quoi dépend le prix ?</h2><p>Du nombre de personnes et de la durée.</p>
<h2>Que comprend l’atelier ?</h2><p>Un diagnostic, un temps collectif et un suivi.</p>
<h2>Comment demander un devis ?</h2><p>Par un premier échange gratuit.</p>
<h2>${FAQ_HEADING}</h2>
<h3>Faut-il un diagnostic ?</h3><p>Oui, il précède l’atelier.</p>
<h3>Est-ce possible en visio ?</h3><p>Oui, selon le format retenu.</p>
<h3>Combien de temps dure un atelier ?</h3><p>Cela dépend du diagnostic.</p><p>Nous l’ajustons ensemble.</p>
`

describe('directAnswer', () => {
  it('renvoie le premier paragraphe en texte brut', () => {
    expect(directAnswer('<p>Bonjour <strong>à</strong> tous &amp; toutes</p><p>Suite</p>')).toBe('Bonjour à tous & toutes')
    expect(directAnswer('<h2>Titre</h2>')).toBe('')
    expect(directAnswer('')).toBe('')
  })
})

describe('extractFaq', () => {
  it('lit les questions (H3) et leurs réponses sous « Questions fréquentes »', () => {
    const faq = extractFaq(GOOD)
    expect(faq.map(f => f.q)).toEqual(['Faut-il un diagnostic ?', 'Est-ce possible en visio ?', 'Combien de temps dure un atelier ?'])
    expect(faq[2].a).toBe('Cela dépend du diagnostic. Nous l’ajustons ensemble.') // plusieurs paragraphes réunis
  })
  it('accepte « Questions fréquentes » sans accent ou en majuscules, et le singulier', () => {
    for (const h of ['Questions frequentes', 'QUESTIONS FRÉQUENTES', 'Question fréquente']) {
      expect(extractFaq(`<h2>${h}</h2><h3>Q ?</h3><p>R.</p>`)).toHaveLength(1)
    }
  })
  it('s\'arrête à la section suivante', () => {
    const html = `<h2>${FAQ_HEADING}</h2><h3>Q1 ?</h3><p>R1.</p><h2>Pour aller plus loin</h2><h3>Pas une question fréquente ?</h3><p>Hors FAQ.</p>`
    expect(extractFaq(html).map(f => f.q)).toEqual(['Q1 ?'])
  })
  it('ignore une question sans réponse', () => {
    expect(extractFaq(`<h2>${FAQ_HEADING}</h2><h3>Seule ?</h3><h3>Avec ?</h3><p>Oui.</p>`).map(f => f.q)).toEqual(['Avec ?'])
  })
  it('sans section FAQ : liste vide', () => {
    expect(extractFaq('<h2>Autre</h2><h3>Q ?</h3><p>R.</p>')).toEqual([])
    expect(extractFaq('')).toEqual([])
  })
  it('le modèle non rempli ne déclare rien (jamais de FAQ vide pour Google)', () => {
    expect(extractFaq(ARTICLE_TEMPLATE_HTML)).toEqual([])
  })
  it('le HTML saisi est réduit au texte (pas de balise dans la FAQ)', () => {
    const faq = extractFaq(`<h2>${FAQ_HEADING}</h2><h3>Q <em>?</em></h3><p>R <a href="x">lien</a><script>alert(1)</script></p>`)
    expect(faq[0].q).toBe('Q ?')
    expect(faq[0].a).not.toContain('<')
  })
})

describe('checkArticle', () => {
  const ok = (id: string, r: ReturnType<typeof checkArticle>) => r.find(c => c.id === id)!.ok
  const good = checkArticle({
    title: 'Combien coûte un atelier de cohésion ?', slug: 'combien-coute-atelier-cohesion', html: GOOD,
    description: 'Un atelier de cohésion coûte entre 1 500 et 4 000 euros pour dix personnes : ce qui fait varier le prix et comment demander un devis.',
  })

  it('un article conforme passe toutes les vérifications', () => {
    expect(good.filter(c => !c.ok).map(c => c.id)).toEqual([])
  })
  it('chaque vérification a un libellé et un conseil', () => {
    for (const c of good) { expect(c.label.length).toBeGreaterThan(5); expect(c.hint.length).toBeGreaterThan(10) }
  })
  it('titre qui n\'est pas une question, adresse trop courte', () => {
    const r = checkArticle({ title: 'Atelier de cohésion', slug: 'atelier', html: GOOD })
    expect(ok('title', r)).toBe(false)
    expect(ok('slug', r)).toBe(false)
  })
  it('réponse courte trop longue ou sans chiffre', () => {
    const long = `<p>${'mot '.repeat(90)}</p>`
    expect(ok('answer', checkArticle({ html: long }))).toBe(false)
    const noNumber = '<p>' + 'Un atelier coûte un prix variable selon la durée et le format retenu pour votre équipe, après un échange gratuit avec nous.' + '</p>'
    const r = checkArticle({ html: noNumber })
    expect(ok('answer', r)).toBe(false) // 22 mots : trop court
    expect(ok('number', r)).toBe(false)
  })
  it('moins de trois intertitres, FAQ incomplète', () => {
    const r = checkArticle({ html: `<p>${ANSWER}</p><h2>Seul ?</h2><p>x</p><h2>${FAQ_HEADING}</h2><h3>Q ?</h3><p>R.</p>` })
    expect(ok('h2', r)).toBe(false)
    expect(ok('faq', r)).toBe(false)
  })
  it('le modèle brut échoue : il reste à le remplir, et les crochets sont signalés', () => {
    const r = checkArticle({ title: '', slug: '', html: ARTICLE_TEMPLATE_HTML })
    expect(ok('placeholders', r)).toBe(false)
    expect(ok('faq', r)).toBe(false)
    expect(ok('answer', r)).toBe(false)
    expect(ok('h2', r)).toBe(false)
  })
  it('description Google : 70 à 158 caractères', () => {
    expect(ok('description', checkArticle({ description: 'trop court' }))).toBe(false)
    expect(ok('description', checkArticle({ description: 'x'.repeat(159) }))).toBe(false)
    expect(ok('description', checkArticle({ description: 'x'.repeat(100) }))).toBe(true)
  })
  it('un article vide ne plante pas', () => {
    expect(() => checkArticle({})).not.toThrow()
  })
})

describe('shouldShowUpdated', () => {
  it('seulement si la mise à jour est postérieure d\'au moins un jour', () => {
    expect(shouldShowUpdated('2026-11-01T10:00:00Z', '2026-11-05T10:00:00Z')).toBe(true)
    expect(shouldShowUpdated('2026-11-01T10:00:00Z', '2026-11-01T10:05:00Z')).toBe(false)
    expect(shouldShowUpdated('2026-11-01T10:00:00Z', '2026-10-30T10:00:00Z')).toBe(false)
    expect(shouldShowUpdated(null, '2026-11-05T10:00:00Z')).toBe(false)
    expect(shouldShowUpdated('pas une date', '2026-11-05T10:00:00Z')).toBe(false)
  })
})
