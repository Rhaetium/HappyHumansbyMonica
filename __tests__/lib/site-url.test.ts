import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const load = async () => {
  vi.resetModules()
  return import('@/lib/site-url')
}

describe('SITE_URL', () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL
  beforeEach(() => { delete process.env.NEXT_PUBLIC_SITE_URL })
  afterEach(() => { if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = saved })

  it('sans variable : l’adresse par défaut', async () => {
    const m = await load()
    expect(m.SITE_URL).toBe(m.DEFAULT_SITE_URL)
  })

  it('NEXT_PUBLIC_SITE_URL remplace l’adresse, slash final retiré', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = ' https://happyhumans.fr/ '
    expect((await load()).SITE_URL).toBe('https://happyhumans.fr')
    process.env.NEXT_PUBLIC_SITE_URL = 'https://happyhumans.fr///'
    expect((await load()).SITE_URL).toBe('https://happyhumans.fr')
  })

  it('une variable vide ne casse rien : retour à l’adresse par défaut', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   '
    const m = await load()
    expect(m.SITE_URL).toBe(m.DEFAULT_SITE_URL)
  })

  it('tout ce qui dépend de l’adresse la suit : Search Console, mentions légales', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://happyhumans.fr'
    vi.resetModules()
    const sc = await import('@/lib/search-console')
    const legal = await import('@/lib/cms-defaults/mentions-legales')
    expect(sc.SEARCH_CONSOLE_PROPERTY_DEFAULT).toBe('https://happyhumans.fr/')
    expect(legal.MENTIONS_LEGALES_DEFAULTS.t_happyhumans_vercel_app).toBe('happyhumans.fr')
  })
})

// Garde-fou : l'adresse du site ne s'écrit qu'à un seul endroit (lib/site-url.ts). Sinon, changer de nom de domaine
// laisse des liens, des e-mails ou des réglages sur l'ancienne adresse.
describe('adresse du site non écrite en dur', () => {
  const root = path.resolve(__dirname, '../..')
  const ALLOWED = new Set(['lib/site-url.ts'])
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p, out)
      else if (/\.tsx?$/.test(e.name)) out.push(p)
    }
    return out
  }

  it('aucun fichier de l’application n’écrit happyhumans.vercel.app ou happyhumans.fr', () => {
    const offenders: string[] = []
    for (const dir of ['app', 'components', 'lib', 'hooks', 'contexts']) {
      for (const file of walk(path.join(root, dir))) {
        const rel = path.relative(root, file).split(path.sep).join('/')
        if (ALLOWED.has(rel)) continue
        fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (/happyhumans\.(vercel\.app|fr)\b/.test(line)) offenders.push(`${rel}:${i + 1} → ${line.trim().slice(0, 90)}`)
        })
      }
    }
    expect(offenders, `Adresse du site écrite en dur :\n${offenders.join('\n')}\nUtilisez SITE_URL (lib/site-url.ts).`).toEqual([])
  })
})
