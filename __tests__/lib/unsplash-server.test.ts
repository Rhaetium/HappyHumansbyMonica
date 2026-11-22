import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { searchUnsplashPhotos } from '@/lib/unsplash-server'

const root = path.resolve(__dirname, '../..')
const photo = { id: 'a', urls: { raw: '', full: '', regular: 'https://img/r.jpg', small: '', thumb: '' }, alt_description: null, description: null, user: { name: 'N', username: 'n' }, likes: 1 }
const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch

describe('searchUnsplashPhotos', () => {
  it('envoie la clé dans l’en-tête, la recherche encodée et borne le nombre de résultats', async () => {
    const f = ok({ results: [photo] })
    const r = await searchUnsplashPhotos('CLE-DE-TEST', 'équipe & confiance', 99, f)
    expect(r).toHaveLength(1)
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain('query=%C3%A9quipe%20%26%20confiance')
    expect(String(url)).toContain('per_page=12')
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Client-ID CLE-DE-TEST' })
  })
  it('sans clé ou sans recherche : aucun appel réseau', async () => {
    const f = ok({ results: [photo] })
    expect(await searchUnsplashPhotos(undefined, 'x', 5, f)).toEqual([])
    expect(await searchUnsplashPhotos('  ', 'x', 5, f)).toEqual([])
    expect(await searchUnsplashPhotos('k', '  ', 5, f)).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
  it('clé refusée, réponse inattendue ou réseau en panne : liste vide, jamais d’exception', async () => {
    expect(await searchUnsplashPhotos('k', 'x', 5, vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch)).toEqual([])
    expect(await searchUnsplashPhotos('k', 'x', 5, ok({ results: 'oops' }))).toEqual([])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await searchUnsplashPhotos('k', 'x', 5, vi.fn().mockRejectedValue(new Error('réseau')) as unknown as typeof fetch)).toEqual([])
  })
})

describe('aucun identifiant Unsplash dans le code', () => {
  const walk = (dir: string): string[] => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) return ['node_modules', '.next', '.git'].includes(e.name) ? [] : walk(rel)
    return /\.(ts|tsx|js|cjs|mjs|json|md)$/.test(e.name) ? [rel] : []
  })
  it('ni clé d’accès ni clé secrète ni UNSPLASH_CONFIG en dur', () => {
    const files = ['app', 'components', 'lib', 'hooks', 'scripts', 'docs'].flatMap(d => (fs.existsSync(path.join(root, d)) ? walk(d) : []))
    const bad: string[] = []
    for (const f of files) {
      const src = fs.readFileSync(path.join(root, f), 'utf8')
      if (/UNSPLASH_CONFIG/.test(src)) bad.push(`${f} : UNSPLASH_CONFIG`)
      if (/(accessKey|secretKey)\s*:\s*['"][A-Za-z0-9_-]{20,}['"]/.test(src)) bad.push(`${f} : clé en dur`)
      if (/Client-ID\s+[A-Za-z0-9_-]{20,}/.test(src)) bad.push(`${f} : Client-ID en dur`)
    }
    expect(bad).toEqual([])
  })
})
