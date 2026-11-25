import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function csp(nodeEnv: string): Promise<string> {
  vi.stubEnv('NODE_ENV', nodeEnv)
  const path = require_.resolve('../../next.config.js')
  delete require_.cache[path]
  const config = require_('../../next.config.js')
  const rules = await config.headers()
  const header = rules.flatMap((r: { headers: { key: string; value: string }[] }) => r.headers).find((h: { key: string }) => h.key === 'Content-Security-Policy')
  return header.value as string
}

afterEach(() => vi.unstubAllEnvs())

describe('Content-Security-Policy', () => {
  it('en production : pas de unsafe-eval, objets interdits, scripts tiers conservés', async () => {
    const value = await csp('production')
    expect(value).not.toContain('unsafe-eval')
    expect(value).toContain("object-src 'none'")
    expect(value).toContain('https://assets.calendly.com')
    expect(value).toContain('https://www.googletagmanager.com')
  })

  it('en développement : unsafe-eval reste permis (rechargement à chaud)', async () => {
    expect(await csp('development')).toContain("'unsafe-eval'")
  })
})
