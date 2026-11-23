import { describe, it, expect } from 'vitest'
import { auditLinks, buildKnownPaths, extractHrefs, internalPath } from '@/lib/link-audit'

const SITE = 'https://www.happyhumans.fr'
const known = buildKnownPaths({ articleSlugs: ['dire-non'], customPagePaths: ['/p/atelier'], redirectFrom: ['/ancienne-page'] })

describe('extractHrefs', () => {
  it('lit les liens d’un HTML et d’un JSON contenant du HTML', () => {
    expect(extractHrefs('<p><a href="/coaching">x</a> <a href=\'/contact\'>y</a></p>')).toEqual(['/coaching', '/contact'])
    expect(extractHrefs('{"body":"<a href=\\"/blog/a\\">x</a>"}')).toEqual(['/blog/a'])
  })
})

describe('internalPath', () => {
  it('reconnaît les liens vers le site, avec ou sans domaine', () => {
    expect(internalPath('/Coaching/', SITE)).toBe('/coaching')
    expect(internalPath('https://happyhumans.fr/blog/x?a=1#b', SITE)).toBe('/blog/x')
  })
  it('ignore externes, ancres, mail, téléphone', () => {
    for (const h of ['https://autre.site/a', '#haut', 'mailto:a@b.fr', 'tel:+33123', '//cdn.x/y', 'javascript:void(0)', '']) {
      expect(internalPath(h, SITE), h).toBeNull()
    }
  })
})

describe('auditLinks', () => {
  it('signale seulement les liens internes vers une page qui n’existe pas', () => {
    const sources = [
      { where: 'Page Accueil — Bouton', tab: 'pages' as const, value: '/coachng', isHref: true }, // faute de frappe
      { where: 'Page Accueil — Autre', tab: 'pages' as const, value: '/coaching', isHref: true },
      { where: 'Article « A »', tab: 'articles' as const, value: '<a href="/blog/dire-non">ok</a><a href="/blog/supprime">cassé</a><a href="https://x.fr">ext</a>' },
      { where: 'Page libre', tab: 'custom-pages' as const, value: '<a href="/p/atelier">ok</a><a href="/ancienne-page">redirigée</a>' },
      { where: 'Image', tab: 'pages' as const, value: '/images/photo.jpg', isHref: true },
    ]
    expect(auditLinks(sources, known, SITE)).toEqual([
      { where: 'Page Accueil — Bouton', tab: 'pages', href: '/coachng' },
      { where: 'Article « A »', tab: 'articles', href: '/blog/supprime' },
    ])
  })
  it('ne répète pas le même lien cassé au même endroit', () => {
    const s = [{ where: 'A', tab: 'articles' as const, value: '<a href="/nope">1</a><a href="/nope/">2</a>' }]
    expect(auditLinks(s, known, SITE)).toHaveLength(1)
  })
})
