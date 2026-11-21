import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Garde-fou : le sitemap et /llms.txt ne doivent jamais annoncer une page qui n'existe pas (erreur 404).
 * Google signale une URL « soumise mais introuvable » et Searchable audite une page d'erreur.
 * Une page volontairement désactivée (appel à notFound()) ne doit donc pas y figurer.
 */
const root = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8')

/** Chemins déclarés en dur dans app/sitemap.ts : { path: '/coaching', … } (l'accueil est '') */
function sitemapPaths(): string[] {
  return [...read('app/sitemap.ts').matchAll(/\{\s*path:\s*'([^']*)'/g)].map(m => m[1])
}

function pageFile(routePath: string): string | null {
  const dir = path.join(root, 'app', routePath)
  for (const name of ['page.tsx', 'page.ts', 'page.jsx']) {
    const f = path.join(dir, name)
    if (fs.existsSync(f)) return f
  }
  return null
}

describe('le sitemap n\'annonce que des pages qui existent', () => {
  const paths = sitemapPaths()

  it('lit bien les chemins du sitemap', () => {
    expect(paths.length).toBeGreaterThan(8)
    expect(paths).toContain('')
    expect(paths).toContain('/coaching')
  })

  it.each(paths)('« %s » a une page qui ne répond pas 404', (p) => {
    const file = pageFile(p)
    expect(file, `app${p}/page.tsx est introuvable`).not.toBeNull()
    const src = fs.readFileSync(file!, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect(/\bnotFound\s*\(\s*\)/.test(src), `app${p}/page.tsx appelle notFound() : à retirer du sitemap`).toBe(false)
  })

  it('/llms.txt ne liste que des pages du sitemap ou du CMS (pas de page désactivée)', () => {
    const src = read('app/llms.txt/route.ts')
    const list = src.match(/const PAGES = \[([\s\S]*?)\]/)![1]
    const slugs = [...list.matchAll(/'([a-z-]+)'/g)].map(m => m[1])
    for (const slug of slugs) {
      if (slug === 'home') continue
      const file = pageFile(`/${slug}`)
      expect(file, `/llms.txt liste « ${slug} » mais app/${slug}/page.tsx est introuvable`).not.toBeNull()
      const code = fs.readFileSync(file!, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
      expect(/\bnotFound\s*\(\s*\)/.test(code), `/llms.txt liste « ${slug} » qui appelle notFound()`).toBe(false)
    }
  })
})
