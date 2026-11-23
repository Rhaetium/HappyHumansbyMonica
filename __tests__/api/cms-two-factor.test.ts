import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { base32Decode, totpAt } from '@/lib/totp'
import { createCmsSessionResponse } from '@/lib/cms-auth'

const mem = { state: null as null | { secret: string; recovery: string[]; enabledAt: string }, pending: null as string | null }

vi.mock('@/lib/two-factor-store', () => ({
  readTwoFactor: async () => (mem.state ? { status: 'on', state: mem.state } : { status: 'off' }),
  saveTwoFactor: async (s: typeof mem.state) => { mem.state = s; mem.pending = null; return true },
  deleteTwoFactor: async () => { mem.state = null; mem.pending = null; return true },
  savePending: async (s: string) => { mem.pending = s; return true },
  readPending: async () => mem.pending,
  twoFactorForcedOff: () => false,
}))

import { GET, POST } from '@/app/api/cms/two-factor/route'

const PWD = 'bon-mot-de-passe-de-test'
let cookie = ''
let n = 0
const call = (method: 'GET' | 'POST', body?: Record<string, unknown>, authed = true) =>
  (method === 'GET' ? GET : POST)(new Request('http://localhost/api/cms/two-factor', {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${++n}`, ...(authed ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }) as never)

describe('/api/cms/two-factor', () => {
  beforeAll(() => {
    process.env.CMS_PASSWORD = PWD
    process.env.CMS_SESSION_SECRET = 'secret-de-test-assez-long-pour-signer'
    const res = createCmsSessionResponse()
    cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  })
  beforeEach(() => { mem.state = null; mem.pending = null })

  it('exige une session', async () => {
    expect((await call('GET', undefined, false)).status).toBe(401)
    expect((await call('POST', { action: 'start' }, false)).status).toBe(401)
  })

  it('active : start → confirm avec un vrai code → 8 codes de secours montrés une fois, empreintes seules gardées', async () => {
    const start = await (await call('POST', { action: 'start' })).json()
    expect(start.key).toMatch(/^[A-Z2-7]{4}( [A-Z2-7]{4}){7}$/)
    expect(mem.pending).toBeTruthy()

    const bad = await call('POST', { action: 'confirm', code: '000000' })
    expect(bad.status).toBe(400)
    expect(mem.state).toBeNull()

    const ok = await (await call('POST', { action: 'confirm', code: totpAt(mem.pending!, Date.now()) })).json()
    expect(ok.recoveryCodes).toHaveLength(8)
    expect(mem.state?.recovery).toHaveLength(8)
    expect(JSON.stringify(mem.state)).not.toContain(ok.recoveryCodes[0]) // jamais en clair
    expect((await (await call('GET')).json()).enabled).toBe(true)
  })

  it('désactive seulement avec le mot de passe ET un code valide', async () => {
    await call('POST', { action: 'start' })
    await call('POST', { action: 'confirm', code: totpAt(mem.pending!, Date.now()) })
    const secret = mem.state!.secret
    expect(base32Decode(secret).length).toBe(20)

    expect((await call('POST', { action: 'disable', password: 'mauvais', code: totpAt(secret, Date.now()) })).status).toBe(400)
    expect((await call('POST', { action: 'disable', password: PWD, code: '000000' })).status).toBe(400)
    expect(mem.state).not.toBeNull()
    expect((await call('POST', { action: 'disable', password: PWD, code: totpAt(secret, Date.now()) })).status).toBe(200)
    expect(mem.state).toBeNull()
  })

  it('refuse de réactiver quand c’est déjà activé', async () => {
    await call('POST', { action: 'start' })
    await call('POST', { action: 'confirm', code: totpAt(mem.pending!, Date.now()) })
    expect((await call('POST', { action: 'start' })).status).toBe(409)
  })
})
