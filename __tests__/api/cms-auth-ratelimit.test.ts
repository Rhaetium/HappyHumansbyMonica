import { describe, it, expect, beforeAll } from 'vitest'
import { POST } from '@/app/api/cms/auth/route'
import { LOGIN_MAX_FAILURES } from '@/lib/rate-limit'

const login = (password: unknown, ip: string) =>
  POST(new Request('http://localhost/api/cms/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ password }),
  }))

describe('POST /api/cms/auth : limite de tentatives', () => {
  beforeAll(() => {
    process.env.CMS_PASSWORD = 'bon-mot-de-passe-de-test'
    process.env.CMS_SESSION_SECRET = 'secret-de-test-assez-long-pour-signer'
  })

  it('bloque après trop d’échecs, même avec le bon mot de passe, sans toucher les autres adresses', async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      expect((await login('mauvais', '203.0.113.50')).status).toBe(401)
    }
    const blocked = await login('bon-mot-de-passe-de-test', '203.0.113.50')
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await login('bon-mot-de-passe-de-test', '203.0.113.51')).status).toBe(200)
  })

  it('une connexion réussie remet le compteur à zéro', async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) await login('mauvais', '203.0.113.60')
    expect((await login('bon-mot-de-passe-de-test', '203.0.113.60')).status).toBe(200)
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) expect((await login('mauvais', '203.0.113.60')).status).toBe(401)
  })

  it('répond 401 (et non une erreur serveur) à un corps illisible ou sans mot de passe', async () => {
    const bad = await POST(new Request('http://localhost/api/cms/auth', { method: 'POST', body: 'pas du json', headers: { 'x-forwarded-for': '203.0.113.70' } }))
    expect(bad.status).toBe(401)
    expect((await login(undefined, '203.0.113.71')).status).toBe(401)
  })
})
