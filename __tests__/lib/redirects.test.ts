import { describe, it, expect } from 'vitest'
import { checkRedirects, normalizePath, normalizeTarget, parseRedirects, resolveRedirect } from '@/lib/redirects'

const errors = (rules: { from: string; to: string }[]) => checkRedirects(rules).filter(p => p.level === 'error')
const warnings = (rules: { from: string; to: string }[]) => checkRedirects(rules).filter(p => p.level === 'warning')

describe('normalizePath', () => {
  it('retire domaine, paramètres, « / » final, majuscules', () => {
    expect(normalizePath('https://exemple.test/Blog/Mon-Article/?a=1#x')).toBe('/blog/mon-article')
    expect(normalizePath('ancienne')).toBe('/ancienne')
    expect(normalizePath('//a//b/')).toBe('/a/b')
    expect(normalizePath('/')).toBe('/')
  })
  it('conserve les liens externes https et les paramètres d’une destination', () => {
    expect(normalizeTarget('https://autre.test/Page')).toBe('https://autre.test/Page')
    expect(normalizeTarget('/Coaching/?x=1')).toBe('/coaching?x=1')
  })
})

describe('parseRedirects', () => {
  it('tolère un champ vide ou abîmé', () => {
    expect(parseRedirects(null)).toEqual([])
    expect(parseRedirects('pas du json')).toEqual([])
    expect(parseRedirects('{"a":1}')).toEqual([])
  })
  it('ignore les lignes incomplètes et normalise', () => {
    expect(parseRedirects(JSON.stringify([{ from: 'Ancien/', to: '/nouveau' }, { from: '', to: '/x' }, { from: '/y' }])))
      .toEqual([{ from: '/ancien', to: '/nouveau' }])
  })
})

describe('checkRedirects', () => {
  it('accepte une redirection simple', () => {
    expect(checkRedirects([{ from: '/ancien', to: '/nouveau' }])).toEqual([])
  })
  it('refuse origine = destination, accueil, adresses réservées, http, doublons', () => {
    expect(errors([{ from: '/a', to: '/a/' }]).length).toBe(1)
    expect(errors([{ from: '/', to: '/a' }]).length).toBe(1)
    expect(errors([{ from: '/api/x', to: '/a' }]).length).toBe(1)
    expect(errors([{ from: '/cms-admin', to: '/a' }]).length).toBe(1)
    expect(errors([{ from: '/sitemap.xml', to: '/a' }]).length).toBe(1)
    expect(errors([{ from: '/a', to: '/api/x' }]).length).toBe(1)
    expect(errors([{ from: '/a', to: 'http://x.test' }]).length).toBe(1)
    expect(errors([{ from: '/a', to: '/b' }, { from: '/A/', to: '/c' }]).length).toBe(1)
  })
  it('détecte une boucle', () => {
    expect(errors([{ from: '/a', to: '/b' }, { from: '/b', to: '/a' }]).length).toBeGreaterThan(0)
  })
  it('avertit d’une chaîne et d’une page qui existe', () => {
    expect(warnings([{ from: '/a', to: '/b' }, { from: '/b', to: '/c' }]).length).toBe(1)
    expect(warnings([{ from: '/coaching', to: '/entreprises' }]).length).toBe(1)
  })
  it('refuse une origine vide', () => {
    expect(errors([{ from: '', to: '/a' }]).length).toBeGreaterThan(0)
  })
})

describe('resolveRedirect', () => {
  const rules = [{ from: '/a', to: '/b' }, { from: '/b', to: '/c' }, { from: '/ext', to: 'https://autre.test/x' }]
  it('suit une chaîne en un seul saut', () => { expect(resolveRedirect(rules, '/a')).toBe('/c') })
  it('ignore la casse et le « / » final', () => { expect(resolveRedirect(rules, '/B/')).toBe('/c') })
  it('conserve les paramètres de la requête', () => { expect(resolveRedirect(rules, '/a', '?utm=1')).toBe('/c?utm=1') })
  it('renvoie null sans règle correspondante, et jamais pour une adresse réservée', () => {
    expect(resolveRedirect(rules, '/zzz')).toBeNull()
    expect(resolveRedirect([{ from: '/api/x', to: '/a' }], '/api/x')).toBeNull()
  })
  it('lien externe', () => { expect(resolveRedirect(rules, '/ext')).toBe('https://autre.test/x') })
  it('ne boucle pas à l’infini', () => {
    const loop = [{ from: '/a', to: '/b' }, { from: '/b', to: '/a' }]
    expect(() => resolveRedirect(loop, '/a')).not.toThrow()
  })
})
