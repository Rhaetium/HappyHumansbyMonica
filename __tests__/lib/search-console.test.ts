import { describe, it, expect } from 'vitest'
import {
  SEARCH_CONSOLE_PROPERTY_DEFAULT,
  extractVerificationToken,
  searchConsoleChecks,
  sitemapUrl,
} from '@/lib/search-console'

describe('extractVerificationToken', () => {
  it('extrait le jeton d’une balise meta complète', () => {
    expect(extractVerificationToken('<meta name="google-site-verification" content="abc123" />')).toBe('abc123')
  })

  it('accepte l’attribut content seul, en guillemets simples ou doubles', () => {
    expect(extractVerificationToken('content="abc123"')).toBe('abc123')
    expect(extractVerificationToken("content='abc123'")).toBe('abc123')
  })

  it('accepte la méthode « fichier HTML »', () => {
    expect(extractVerificationToken('googleabc123.html')).toBe('abc123')
    expect(extractVerificationToken('https://happyhumans.vercel.app/googleabc123.html')).toBe('abc123')
  })

  it('accepte le jeton nu, avec guillemets ou espaces autour', () => {
    expect(extractVerificationToken('  abc123  ')).toBe('abc123')
    expect(extractVerificationToken('"abc123"')).toBe('abc123')
  })

  it('renvoie une chaîne vide quand rien n’est fourni', () => {
    expect(extractVerificationToken('')).toBe('')
    expect(extractVerificationToken('   ')).toBe('')
    expect(extractVerificationToken(null)).toBe('')
    expect(extractVerificationToken(undefined)).toBe('')
  })

  it('privilégie content= quand la balise contient aussi du texte autour', () => {
    const tag = '<meta name="google-site-verification" content="real-token" data-x="googlefake.html" />'
    expect(extractVerificationToken(tag)).toBe('real-token')
  })
})

describe('sitemapUrl', () => {
  it('construit l’adresse du plan du site sans double slash', () => {
    expect(sitemapUrl('https://happyhumans.vercel.app')).toBe('https://happyhumans.vercel.app/sitemap.xml')
    expect(sitemapUrl('https://happyhumans.vercel.app/')).toBe('https://happyhumans.vercel.app/sitemap.xml')
    expect(sitemapUrl('https://happyhumans.vercel.app///')).toBe('https://happyhumans.vercel.app/sitemap.xml')
  })
})

describe('searchConsoleChecks', () => {
  const healthy = {
    token: 'abc123',
    sitemapOk: true,
    robotsOk: true,
    robotsHasSitemap: true,
    sitemapUrl: sitemapUrl('https://happyhumans.vercel.app'),
  }

  it('tout est « ok » quand la balise et les fichiers sont en place', () => {
    const checks = searchConsoleChecks(healthy)
    expect(checks.every(c => c.level === 'ok')).toBe(true)
    expect(checks.map(c => c.id)).toEqual(['gsc-token', 'gsc-sitemap', 'gsc-robots'])
  })

  it('signale l’absence de balise sans bloquer (avertissement, avec la marche à suivre)', () => {
    const checks = searchConsoleChecks({ ...healthy, token: '' })
    const token = checks.find(c => c.id === 'gsc-token')!
    expect(token.level).toBe('warn')
    expect(token.fix).toBeTruthy()
  })

  it('un plan du site injoignable est une erreur (Google ne découvre plus les pages)', () => {
    const checks = searchConsoleChecks({ ...healthy, sitemapOk: false })
    const sitemap = checks.find(c => c.id === 'gsc-sitemap')!
    expect(sitemap.level).toBe('error')
    expect(sitemap.fix).toBeTruthy()
  })

  it('un robots.txt sans plan du site est un avertissement, pas une erreur', () => {
    const checks = searchConsoleChecks({ ...healthy, robotsHasSitemap: false })
    const robots = checks.find(c => c.id === 'gsc-robots')!
    expect(robots.level).toBe('warn')
  })

  it('l’adresse par défaut de la propriété est bien renseignée', () => {
    expect(SEARCH_CONSOLE_PROPERTY_DEFAULT).toMatch(/^https:\/\/.+\.\w+\/$/)
  })
})
