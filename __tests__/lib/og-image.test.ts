import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '../..')

describe('image de partage par défaut', () => {
  const file = 'public/og-happy-humans.jpg'
  it('existe, est un JPEG léger', () => {
    const buf = fs.readFileSync(path.join(root, file))
    expect(buf.subarray(0, 2).toString('hex')).toBe('ffd8')
    expect(buf.length).toBeLessThan(300 * 1024)
  })
  it('fait 1200 × 630 (format des aperçus de liens)', () => {
    const buf = fs.readFileSync(path.join(root, file))
    let i = 2, w = 0, h = 0
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const marker = buf[i + 1]
      if (marker >= 0xc0 && marker <= 0xc3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break }
      i += 2 + buf.readUInt16BE(i + 2)
    }
    expect([w, h]).toEqual([1200, 630])
  })
  it('toutes les références pointent vers un fichier qui existe (jamais l’ancienne image d’un autre site)', () => {
    const files = ['app/layout.tsx', 'lib/page-seo.ts', 'app/blog/[slug]/page.tsx', 'app/p/[slug]/page.tsx']
    for (const f of files) {
      const src = fs.readFileSync(path.join(root, f), 'utf8')
      expect(src, f).not.toContain('og-default.jpg')
      expect(src, f).toContain('og-happy-humans.jpg')
    }
    expect(fs.existsSync(path.join(root, 'public/og-default.jpg'))).toBe(false)
  })
})
