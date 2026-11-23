import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { generateTotpSecret, totpAt, hashRecoveryCode } from '@/lib/totp'
import { LOGIN_MAX_FAILURES } from '@/lib/rate-limit'

const SESSION_SECRET = 'secret-de-test-assez-long-pour-signer'
const TOTP = generateTotpSecret()
const state = { current: null as null | { status: string; state?: unknown; reason?: string } }
const saved: unknown[] = []

vi.mock('@/lib/two-factor-store', () => ({
  readTwoFactor: async () => state.current,
  saveTwoFactor: async (s: unknown) => { saved.push(s); return true },
}))

import { POST } from '@/app/api/cms/auth/route'

let n = 0
const login = (body: Record<string, unknown>, ip = `198.51.100.${++n}`) =>
  POST(new Request('http://localhost/api/cms/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }))

const PWD = 'bon-mot-de-passe-de-test'

describe('POST /api/cms/auth avec double authentification', () => {
  beforeAll(() => {
    process.env.CMS_PASSWORD = PWD
    process.env.CMS_SESSION_SECRET = SESSION_SECRET
  })
  beforeEach(() => {
    saved.length = 0
    state.current = { status: 'on', state: { secret: TOTP, recovery: [hashRecoveryCode('ABCDE-FGHJK', SESSION_SECRET)], enabledAt: 'x' } }
  })

  it('désactivée : le mot de passe suffit, comme avant', async () => {
    state.current = { status: 'off' }
    expect((await login({ password: PWD })).status).toBe(200)
  })

  it('activée : mot de passe seul → demande le code, sans le compter comme un échec', async () => {
    const ip = '198.51.100.200'
    for (let i = 0; i < LOGIN_MAX_FAILURES + 2; i++) {
      const res = await login({ password: PWD }, ip)
      expect(res.status).toBe(401)
      expect((await res.json()).needsCode).toBe(true)
    }
  })

  it('activée : bon code → session ; mauvais code → refus', async () => {
    expect((await login({ password: PWD, code: totpAt(TOTP, Date.now()) })).status).toBe(200)
    const bad = await login({ password: PWD, code: '000000' })
    expect(bad.status).toBe(401)
    expect((await bad.json()).error).toContain('Code incorrect')
  })

  it('mauvais mot de passe : refus, même avec un bon code', async () => {
    expect((await login({ password: 'mauvais', code: totpAt(TOTP, Date.now()) })).status).toBe(401)
  })

  it('les essais de code comptent : après 5 mauvais codes, même le bon est refusé (429)', async () => {
    const ip = '198.51.100.201'
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) expect((await login({ password: PWD, code: '111111' }, ip)).status).toBe(401)
    expect((await login({ password: PWD, code: totpAt(TOTP, Date.now()) }, ip)).status).toBe(429)
  })

  it('code de secours : accepté une fois, puis retiré de la liste enregistrée', async () => {
    const res = await login({ password: PWD, code: 'abcde fghjk' })
    expect(res.status).toBe(200)
    expect(saved).toHaveLength(1)
    expect((saved[0] as { recovery: string[] }).recovery).toEqual([])
  })

  it('état illisible : refus par prudence (503), jamais d’accès sans le second facteur', async () => {
    state.current = { status: 'error', reason: 'Base indisponible.' }
    const res = await login({ password: PWD })
    expect(res.status).toBe(503)
    expect(res.headers.get('set-cookie') ?? '').not.toContain('happyhumans_cms_session=ey')
  })
})
