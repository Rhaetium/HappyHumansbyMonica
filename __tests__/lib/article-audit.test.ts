import { describe, it, expect } from 'vitest'
import { auditArticles, STALE_DAYS, type ArticleAuditInput } from '@/lib/article-audit'
import { FAQ_HEADING } from '@/lib/article-template'

const ANSWER = 'Un atelier de cohésion coûte entre 1 500 et 4 000 euros pour une équipe de dix personnes, selon sa durée et son format. Le prix dépend du diagnostic préalable, du nombre de participants et du suivi prévu après l’atelier ; un devis précis est établi après un premier échange gratuit.'
const GOOD_HTML = `<p>${ANSWER}</p>
<h2>De quoi dépend le prix ?</h2><p>Du nombre de personnes.</p>
<h2>Que comprend l’atelier ?</h2><p>Un diagnostic et un suivi.</p>
<h2>Comment demander un devis ?</h2><p>Par un échange gratuit.</p>
<h2>${FAQ_HEADING}</h2>
<h3>Faut-il un diagnostic ?</h3><p>Oui.</p>
<h3>Est-ce possible en visio ?</h3><p>Oui.</p>
<h3>Quelle durée ?</h3><p>Une journée. <a href="/booking">Réserver un échange</a>.</p>`
const DESC = 'Combien coûte un atelier de cohésion d’équipe : fourchette de prix, ce qui la fait varier et comment obtenir un devis.'
const NOW = new Date('2026-11-23T00:00:00Z')

const good: ArticleAuditInput = {
  id: '1', title: 'Combien coûte un atelier de cohésion ?', slug: 'combien-coute-atelier-cohesion',
  content: GOOD_HTML, seo_description: DESC, featured_image: '/a.webp', updated_at: '2026-10-01T00:00:00Z',
}

describe('auditArticles', () => {
  it('ne signale rien pour un article conforme', () => {
    expect(auditArticles([good], NOW)).toEqual([])
  })

  it('classe d’abord l’article avec le plus de problèmes importants', () => {
    const weak: ArticleAuditInput = { ...good, id: '2', title: 'Notre atelier', slug: 'atelier', content: '<p>Court.</p>', seo_description: '', featured_image: null }
    const minor: ArticleAuditInput = { ...good, id: '3', title: 'Autre sujet ?', slug: 'autre-sujet-pour-tous', featured_image: null }
    const res = auditArticles([minor, weak], NOW)
    expect(res.map(r => r.id)).toEqual(['2', '3'])
    expect(res[0].issues.map(i => i.id)).toEqual(expect.arrayContaining(['answer', 'faq', 'description', 'image']))
  })

  it('signale deux articles au même titre', () => {
    const res = auditArticles([good, { ...good, id: '9', slug: 'autre-adresse-longue-ici' }], NOW)
    expect(res).toHaveLength(2)
    expect(res.every(r => r.issues.some(i => i.id === 'duplicate'))).toBe(true)
  })

  it('signale un article ancien, pas un article récent', () => {
    const old = new Date(NOW.getTime() - (STALE_DAYS + 5) * 86_400_000).toISOString()
    expect(auditArticles([{ ...good, updated_at: old }], NOW)[0].issues.map(i => i.id)).toEqual(['stale'])
    expect(auditArticles([good], NOW)).toEqual([])
  })

  it('retombe sur la date de publication si l’article n’a jamais été mis à jour', () => {
    const res = auditArticles([{ ...good, updated_at: null, published_at: '2024-01-01T00:00:00Z' }], NOW)
    expect(res[0].issues.map(i => i.id)).toEqual(['stale'])
  })

  it('signale un article sans lien interne, mais pas celui qui renvoie vers le site', () => {
    const none = GOOD_HTML.replace(/<a [^>]*>[^<]*<\/a>/, 'lien')
    expect(auditArticles([{ ...good, content: none }], NOW)[0].issues.map(i => i.id)).toEqual(['links'])
    const ext = none + '<p><a href="https://example.com/x">ailleurs</a> <a href="//cdn.example.com">cdn</a> <a href="/">accueil</a></p>'
    expect(auditArticles([{ ...good, content: ext }], NOW)[0].issues.map(i => i.id)).toEqual(['links'])
    const abs = none + '<p><a href="https://happyhumans.fr/coaching">coaching</a></p>'
    expect(auditArticles([{ ...good, content: abs }], NOW)).toEqual([])
  })

  it('compte les images sans texte alternatif', () => {
    const imgs = GOOD_HTML + '<img src="/a.webp"><img src="/b.webp" alt=""><img src="/c.webp" alt="Un atelier">'
    const issue = auditArticles([{ ...good, content: imgs }], NOW)[0].issues.find(i => i.id === 'alt')
    expect(issue?.label).toBe('2 images sans description')
  })

  it('signale les crochets du modèle non remplis', () => {
    const res = auditArticles([{ ...good, content: GOOD_HTML + '<p>[À compléter]</p>' }], NOW)
    expect(res[0].issues.map(i => i.id)).toContain('placeholders')
  })
})
