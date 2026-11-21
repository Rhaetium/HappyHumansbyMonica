import { describe, it, expect } from 'vitest'
import { encryptSecret } from '@/lib/secret-box'
import { SEARCHABLE_KV_KEY, isValidSearchableKey, resolveSearchableKey, searchableKeyStatus } from '@/lib/searchable-key'

// Valeurs FICTIVES : ne jamais mettre une vraie clé dans un test.
const KEY = 'sea_0123456789abcdef0123456789abcdef'
const OTHER_KEY = 'sea_fedcba9876543210fedcba9876543210'
const SECRET = 'secret-de-test-0123456789'

describe('isValidSearchableKey', () => {
  it('accepte « sea_ » + caractères alphanumériques, refuse le reste', () => {
    expect(isValidSearchableKey(KEY)).toBe(true)
    expect(isValidSearchableKey(`  ${KEY} `)).toBe(true)
    expect(isValidSearchableKey('sea_court')).toBe(false)
    expect(isValidSearchableKey('vcp_0123456789abcdef0123456789abcdef')).toBe(false)
    expect(isValidSearchableKey('sea_0123456789abcdef;rm -rf')).toBe(false)
    expect(isValidSearchableKey('')).toBe(false)
  })
})

describe('resolveSearchableKey', () => {
  const env = { CMS_SESSION_SECRET: SECRET }
  it('Vercel passe avant le CMS', () => {
    const kv = { [SEARCHABLE_KV_KEY]: encryptSecret(OTHER_KEY, SECRET) }
    expect(resolveSearchableKey(kv, { ...env, SEARCHABLE_API_KEY: KEY })).toEqual({ value: KEY, source: 'vercel' })
  })
  it('sinon la clé du CMS, déchiffrée', () => {
    const kv = { [SEARCHABLE_KV_KEY]: encryptSecret(KEY, SECRET) }
    expect(resolveSearchableKey(kv, env)).toEqual({ value: KEY, source: 'cms' })
  })
  it('aucune clé : null', () => {
    expect(resolveSearchableKey({}, env)).toBeNull()
  })
  it('clé enregistrée mais secret changé : illisible, jamais la valeur chiffrée', () => {
    const kv = { [SEARCHABLE_KV_KEY]: encryptSecret(KEY, 'ancien-secret-0123456789') }
    expect(resolveSearchableKey(kv, env)).toEqual({ value: '', source: 'cms', unreadable: true })
  })
})

describe('searchableKeyStatus', () => {
  it('ne contient jamais la valeur de la clé', () => {
    const kv = { [SEARCHABLE_KV_KEY]: encryptSecret(KEY, SECRET) }
    const status = searchableKeyStatus(kv, { CMS_SESSION_SECRET: SECRET })
    expect(status).toEqual({ configured: true, source: 'cms', unreadable: false, canStore: true })
    expect(JSON.stringify(status)).not.toContain(KEY)
  })
  it('sans secret de chiffrement, le CMS ne peut pas stocker', () => {
    expect(searchableKeyStatus({}, {}).canStore).toBe(false)
  })
})
