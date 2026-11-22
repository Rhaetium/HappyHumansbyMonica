import { describe, it, expect, vi } from 'vitest'
import { encryptSecret } from '@/lib/secret-box'
import {
  CONNECTIONS, buildConnectionEnv, connectionById, connectionsStatus, kvKeyFor, validateConnectionValues, verifyBrevoKey,
} from '@/lib/connections'

// Valeurs FICTIVES : ne jamais mettre une vraie clé dans un test.
const SECRET = 'secret-de-test-0123456789'
const BREVO = 'xkeysib-' + 'a1b2c3d4'.repeat(6)
const OTHER_BREVO = 'xkeysib-' + 'f9e8d7c6'.repeat(6)
const TOKEN = 'EAA' + 'Z9Y8X7W6'.repeat(4)
const env = { CMS_SESSION_SECRET: SECRET }
const email = connectionById('email')!
const field = (conn: string, name: string) => connectionById(conn)!.fields.find(f => f.env === name)!

describe('catalogue', () => {
  it('chaque secret est stocké sous « secret_… » (la route générale des réglages refuse d\'y écrire)', () => {
    for (const c of CONNECTIONS) for (const f of c.fields) {
      expect(kvKeyFor(f).startsWith(f.secret ? 'secret_conn_' : 'conn_'), f.env).toBe(true)
    }
  })
  it('les identifiants de variables et de stockage sont uniques', () => {
    const envs = CONNECTIONS.flatMap(c => c.fields.map(f => f.env))
    const keys = CONNECTIONS.flatMap(c => c.fields.map(kvKeyFor))
    expect(new Set(envs).size).toBe(envs.length)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('buildConnectionEnv', () => {
  it('Vercel passe avant le CMS', () => {
    const kv = { [kvKeyFor(field('email', 'BREVO_API_KEY'))]: encryptSecret(OTHER_BREVO, SECRET) }
    expect(buildConnectionEnv(kv, { ...env, BREVO_API_KEY: BREVO }).BREVO_API_KEY).toBe(BREVO)
  })
  it('sinon le CMS : secret déchiffré, réglage simple en clair', () => {
    const kv = {
      [kvKeyFor(field('email', 'BREVO_API_KEY'))]: encryptSecret(BREVO, SECRET),
      [kvKeyFor(field('email', 'ADMIN_EMAIL'))]: 'monica@exemple.test',
    }
    expect(buildConnectionEnv(kv, env)).toMatchObject({ BREVO_API_KEY: BREVO, ADMIN_EMAIL: 'monica@exemple.test' })
  })
  it('rien de réglé : objet vide (le code retombe sur ses valeurs d\'origine)', () => {
    expect(buildConnectionEnv({}, env)).toEqual({})
  })
  it('un secret illisible (secret de chiffrement changé) n\'est pas fourni', () => {
    const kv = { [kvKeyFor(field('email', 'BREVO_API_KEY'))]: encryptSecret(BREVO, 'ancien-secret-0123456789') }
    expect(buildConnectionEnv(kv, env).BREVO_API_KEY).toBeUndefined()
  })
  it('une valeur Vercel vide est ignorée (on prend celle du CMS)', () => {
    const kv = { [kvKeyFor(field('email', 'ADMIN_EMAIL'))]: 'monica@exemple.test' }
    expect(buildConnectionEnv(kv, { ...env, ADMIN_EMAIL: '   ' }).ADMIN_EMAIL).toBe('monica@exemple.test')
  })
})

describe('connectionsStatus', () => {
  const kv = {
    [kvKeyFor(field('email', 'BREVO_API_KEY'))]: encryptSecret(BREVO, SECRET),
    [kvKeyFor(field('email', 'ADMIN_EMAIL'))]: 'monica@exemple.test',
    [kvKeyFor(field('instagram', 'INSTAGRAM_ACCESS_TOKEN'))]: encryptSecret(TOKEN, SECRET),
  }
  const status = connectionsStatus(kv, { ...env, SENDER_EMAIL: 'contact@exemple.test' })

  it('ne contient JAMAIS la valeur d\'un secret', () => {
    const json = JSON.stringify(status)
    expect(json).not.toContain(BREVO)
    expect(json).not.toContain(TOKEN)
    expect(json).not.toContain('xkeysib-a1b2')
  })
  it('affiche les réglages simples, pas les secrets', () => {
    const fields = status.connections.find(c => c.id === 'email')!.fields
    expect(fields.find(f => f.env === 'ADMIN_EMAIL')).toMatchObject({ set: true, source: 'cms', value: 'monica@exemple.test' })
    expect(fields.find(f => f.env === 'BREVO_API_KEY')).toMatchObject({ set: true, secret: true })
    expect(fields.find(f => f.env === 'BREVO_API_KEY')).not.toHaveProperty('value')
  })
  it('« configurée » seulement si tous les champs obligatoires sont remplis ; source mixte si Vercel + CMS', () => {
    const e = status.connections.find(c => c.id === 'email')!
    expect(e.configured).toBe(true) // SENDER_NAME est facultatif
    expect(e.source).toBe('mixed')
    expect(status.connections.find(c => c.id === 'instagram')!.configured).toBe(false) // il manque l'identifiant du compte
    expect(status.connections.find(c => c.id === 'unsplash')!.configured).toBe(false) // service facultatif : connecté seulement si une valeur est renseignée
    const withKey = connectionsStatus({}, { ...env, NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'k'.repeat(30) })
    expect(withKey.connections.find(c => c.id === 'unsplash')!.configured).toBe(true)
  })
  it('signale un secret illisible, et le CMS dit s\'il peut enregistrer', () => {
    const broken = connectionsStatus({ [kvKeyFor(field('email', 'BREVO_API_KEY'))]: encryptSecret(BREVO, 'autre-secret-0123456789') }, env)
    expect(broken.connections[0].fields[0]).toMatchObject({ set: false, unreadable: true })
    expect(status.canStore).toBe(true)
    expect(connectionsStatus({}, {}).canStore).toBe(false)
  })
})

describe('validateConnectionValues', () => {
  it('accepte des valeurs plausibles et ignore les champs vides (« inchangé »)', () => {
    const r = validateConnectionValues(email, { BREVO_API_KEY: ` ${BREVO} `, ADMIN_EMAIL: 'monica@exemple.test', SENDER_EMAIL: '', SENDER_NAME: '  ' })
    expect(r).toEqual({ ok: true, values: { BREVO_API_KEY: BREVO, ADMIN_EMAIL: 'monica@exemple.test' } })
  })
  it('refuse une adresse e-mail invalide, avec le nom du champ', () => {
    const r = validateConnectionValues(email, { ADMIN_EMAIL: 'pas-une-adresse' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('Adresse qui reçoit les notifications')
  })
  it('refuse une clé Brevo sans le bon préfixe, ou avec des espaces', () => {
    expect(validateConnectionValues(email, { BREVO_API_KEY: 'sk-quelque-chose-de-long-123456' }).ok).toBe(false)
    expect(validateConnectionValues(email, { BREVO_API_KEY: BREVO + ' en trop' }).ok).toBe(false)
  })
  it('refuse un nom d\'expéditeur avec des chevrons (injection dans l\'en-tête)', () => {
    expect(validateConnectionValues(email, { SENDER_NAME: 'Monica <evil@x.test>' }).ok).toBe(false)
    expect(validateConnectionValues(email, { SENDER_NAME: 'Monica\nBcc: x@y.test' }).ok).toBe(false)
    expect(validateConnectionValues(email, { SENDER_NAME: 'Happy Humans' }).ok).toBe(true)
  })
  it('refuse une variable inconnue et une valeur qui n\'est pas du texte', () => {
    expect(validateConnectionValues(email, { PATH: '/bin' }).ok).toBe(false)
    expect(validateConnectionValues(email, { ADMIN_EMAIL: 42 }).ok).toBe(false)
  })
  it('Instagram : identifiant numérique, jeton sans espace', () => {
    const ig = connectionById('instagram')!
    expect(validateConnectionValues(ig, { INSTAGRAM_BUSINESS_ACCOUNT_ID: '17841400000000000', INSTAGRAM_ACCESS_TOKEN: TOKEN }).ok).toBe(true)
    expect(validateConnectionValues(ig, { INSTAGRAM_BUSINESS_ACCOUNT_ID: 'abc' }).ok).toBe(false)
    expect(validateConnectionValues(ig, { INSTAGRAM_ACCESS_TOKEN: 'EAA ' + 'x'.repeat(30) }).ok).toBe(false)
  })
})

describe('verifyBrevoKey', () => {
  const res = (status: number) => vi.fn(async () => new Response('{}', { status })) as unknown as typeof fetch
  it('valide / invalide / injoignable', async () => {
    expect(await verifyBrevoKey(BREVO, res(200))).toBe('valid')
    expect(await verifyBrevoKey(BREVO, res(401))).toBe('invalid')
    expect(await verifyBrevoKey(BREVO, res(503))).toBe('unreachable')
    expect(await verifyBrevoKey(BREVO, vi.fn(async () => { throw new Error('réseau') }) as unknown as typeof fetch)).toBe('unreachable')
  })
  it('envoie la clé dans l\'en-tête api-key, jamais dans l\'adresse', async () => {
    const f = res(200)
    await verifyBrevoKey(BREVO, f)
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/account')
    expect((init.headers as Record<string, string>)['api-key']).toBe(BREVO)
  })
})
