import { describe, it, expect } from 'vitest'
import { checkEnvironment, checkSupabase, toHealthChecks, summarize, type Env } from '@/lib/env-check'

const URL = 'https://abcdefghij0123456789.supabase.co'
const ANON = 'sb_publishable_ANONKEY_secret_marker_1234567890'
const SERVICE = 'sb_secret_SERVICEKEY_secret_marker_1234567890'
const PASSWORD = 'mot-de-passe-tres-long-et-unique'

const good: Env = {
  NEXT_PUBLIC_SUPABASE_URL: URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE,
  CMS_PASSWORD: PASSWORD,
  CMS_SESSION_SECRET: 'a'.repeat(40),
  CMS_HMAC_SECRET: 'b'.repeat(40),
  NEXT_PUBLIC_SITE_URL: 'https://www.happyhumans.example',
  BREVO_API_KEY: 'xkeysib-x', SENDER_EMAIL: 'a@b.fr', ADMIN_EMAIL: 'a@b.fr',
}

const level = (checks: ReturnType<typeof checkEnvironment>, id: string) => checks.find(c => c.id === id)?.level

describe('checkEnvironment', () => {
  it('ne signale aucun problème bloquant sur une configuration complète', () => {
    const s = summarize(checkEnvironment(good))
    expect(s.fail).toBe(0)
    expect(s.warn).toBe(0)
  })

  it('signale en échec les variables obligatoires manquantes', () => {
    const checks = checkEnvironment({})
    for (const id of ['supabase-url', 'supabase-anon', 'supabase-service', 'cms-password']) {
      expect(level(checks, id)).toBe('fail')
    }
  })

  it('refuse une adresse Supabase mal formée (avec /rest/v1 ou slash final)', () => {
    expect(level(checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_URL: `${URL}/rest/v1` }), 'supabase-url')).toBe('fail')
    expect(level(checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321' }), 'supabase-url')).toBe('fail')
  })

  it('détecte une clé secrète collée à la place de la clé publique', () => {
    expect(level(checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_ANON_KEY: SERVICE }), 'supabase-anon')).toBe('fail')
  })

  it('détecte la clé publique collée à la place de la clé serveur', () => {
    expect(level(checkEnvironment({ ...good, SUPABASE_SERVICE_ROLE_KEY: ANON }), 'supabase-service')).toBe('fail')
  })

  it('avertit d’un mot de passe court et d’un secret identique au mot de passe', () => {
    expect(level(checkEnvironment({ ...good, CMS_PASSWORD: 'court' }), 'cms-password')).toBe('warn')
    expect(level(checkEnvironment({ ...good, CMS_SESSION_SECRET: PASSWORD + 'x'.repeat(30) }), 'CMS_SESSION_SECRET')).toBe('ok')
    expect(level(checkEnvironment({ ...good, CMS_PASSWORD: 'p'.repeat(40), CMS_HMAC_SECRET: 'p'.repeat(40) }), 'CMS_HMAC_SECRET')).toBe('warn')
  })

  it('rappelle que l’adresse vercel.app est provisoire, sans bloquer', () => {
    expect(level(checkEnvironment({ ...good, NEXT_PUBLIC_SITE_URL: 'https://monsite.vercel.app' }), 'site-url')).toBe('warn')
    expect(level(checkEnvironment({ ...good, NEXT_PUBLIC_SITE_URL: 'https://monsite.fr/' }), 'site-url')).toBe('fail')
  })

  it('ne révèle JAMAIS la valeur d’une clé ou d’un mot de passe', () => {
    const everything = JSON.stringify([...checkEnvironment(good), ...checkEnvironment({ ...good, CMS_PASSWORD: 'court', SUPABASE_SERVICE_ROLE_KEY: ANON })])
    for (const secret of [ANON, SERVICE, PASSWORD, 'court', 'a'.repeat(40), 'xkeysib-x']) {
      expect(everything).not.toContain(secret)
    }
  })
})

// Fausse base : chaque table renvoie des lignes selon la clé utilisée.
function fakeFetch(opts: { missing?: string[]; anonRows?: Record<string, number>; serviceRows?: number; status?: number; reject?: boolean }): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (opts.reject) throw new Error('network')
    const url = String(input)
    const table = url.split('/rest/v1/')[1].split('?')[0]
    const key = (init?.headers as Record<string, string>).apikey
    const isAnon = key === ANON
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
    if (opts.status && !isAnon) return json(opts.status, { message: 'denied' })
    if (opts.missing?.includes(table)) return json(404, { code: 'PGRST205', message: 'no table' })
    const n = isAnon ? (opts.anonRows?.[table] ?? 0) : (opts.serviceRows ?? 3)
    return json(200, Array.from({ length: n }, (_, i) => ({ id: i })))
  }) as typeof fetch
}

describe('checkSupabase', () => {
  it('ne teste rien sans adresse ou clé serveur', async () => {
    const res = await checkSupabase({}, fakeFetch({}))
    expect(res).toHaveLength(1)
    expect(res[0].level).toBe('info')
  })

  it('valide une base complète où rien de privé n’est lisible', async () => {
    const res = await checkSupabase(good, fakeFetch({}))
    expect(summarize(res).fail).toBe(0)
    expect(res.filter(c => c.id.startsWith('exposure-')).every(c => c.level === 'ok')).toBe(true)
  })

  it('signale en échec une table obligatoire absente, avec la migration à lancer', async () => {
    const res = await checkSupabase(good, fakeFetch({ missing: ['questionnaires'] }))
    const c = res.find(x => x.id === 'table-questionnaires')!
    expect(c.level).toBe('fail')
    expect(c.fix).toContain('20261102000000_questionnaires.sql')
  })

  it('signale seulement en avertissement une table recommandée absente', async () => {
    const res = await checkSupabase(good, fakeFetch({ missing: ['booking_slots'] }))
    expect(res.find(x => x.id === 'table-booking_slots')!.level).toBe('warn')
  })

  it('détecte une table de données personnelles lisible par un visiteur anonyme', async () => {
    const res = await checkSupabase(good, fakeFetch({ anonRows: { contact_messages: 2 } }))
    const c = res.find(x => x.id === 'exposure-contact_messages')!
    expect(c.level).toBe('fail')
    expect(c.detail).toContain('LIRE')
  })

  it('ne conclut pas quand la table est vide (impossible de vérifier)', async () => {
    const res = await checkSupabase(good, fakeFetch({ serviceRows: 0 }))
    expect(res.find(x => x.id === 'exposure-contact_messages')!.level).toBe('info')
  })

  it('explique une clé serveur refusée', async () => {
    const res = await checkSupabase(good, fakeFetch({ status: 401 }))
    expect(res.some(c => c.level === 'fail' && /ne correspond pas/.test(c.fix ?? ''))).toBe(true)
  })

  it('signale un projet injoignable et s’arrête après le premier échec', async () => {
    const res = await checkSupabase(good, fakeFetch({ reject: true }))
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ id: 'supabase-reach', level: 'fail' })
  })

  it('ne révèle jamais les clés dans ses résultats', async () => {
    const out = JSON.stringify(await checkSupabase(good, fakeFetch({ anonRows: { contact_messages: 1 }, missing: ['booking_slots'] })))
    expect(out).not.toContain(ANON)
    expect(out).not.toContain(SERVICE)
  })
})

describe('toHealthChecks (tableau de bord)', () => {
  it('ne garde que les problèmes, en niveaux error / warn', () => {
    const out = toHealthChecks(checkEnvironment({ ...good, SUPABASE_SERVICE_ROLE_KEY: undefined, CMS_PASSWORD: 'court' }))
    expect(out.map(c => c.level).sort()).toEqual(['error', 'warn'])
    expect(out.every(c => c.id.startsWith('config-'))).toBe(true)
  })

  it('renvoie un seul contrôle « ok » quand tout va bien', () => {
    const out = toHealthChecks(checkEnvironment(good))
    expect(out).toHaveLength(1)
    expect(out[0].level).toBe('ok')
  })

  it('n’alerte pas pour les fonctions facultatives non configurées', () => {
    const out = toHealthChecks(checkEnvironment({ ...good, ANTHROPIC_API_KEY: undefined, GSC_SERVICE_ACCOUNT_EMAIL: undefined }))
    expect(out.every(c => c.level === 'ok')).toBe(true)
  })
})
