import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptSecret } from '@/lib/secret-box'

// Valeurs FICTIVES : ne jamais mettre une vraie clé dans un test.
const SECRET = 'secret-de-test-0123456789'
const CMS_KEY = 'xkeysib-' + 'c1c2c3c4'.repeat(6)
const VERCEL_KEY = 'xkeysib-' + 'd1d2d3d4'.repeat(6)

let kv: Record<string, string> = {}
vi.mock('@/lib/cms-settings-server', () => ({ getKvSettings: async () => kv }))

import { sendEmail } from '@/lib/send-email'

const sent = () => {
  const f = globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }
  const [url, init] = f.mock.calls[0]
  return { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) }
}

describe('sendEmail : clé et expéditeur venus du CMS ou de Vercel', () => {
  beforeEach(() => {
    vi.stubEnv('CMS_SESSION_SECRET', SECRET)
    vi.stubEnv('BREVO_API_KEY', '')
    vi.stubEnv('SENDER_EMAIL', '')
    vi.stubEnv('SENDER_NAME', '')
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ messageId: 'm1' }), { status: 201 })) as unknown as typeof fetch
    kv = {}
  })
  afterEach(() => { vi.unstubAllEnvs() })

  it('sans clé nulle part : rien n\'est envoyé (comportement d\'origine)', async () => {
    expect(await sendEmail({ to: 'a@exemple.test', subject: 's', html: '<p>x</p>' })).toEqual({ skipped: true })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('utilise la clé et l\'expéditeur enregistrés dans le CMS', async () => {
    kv = {
      secret_conn_brevo_api_key: encryptSecret(CMS_KEY, SECRET),
      conn_sender_email: 'contact@exemple.test',
      conn_sender_name: 'Monica',
    }
    expect(await sendEmail({ to: 'a@exemple.test', subject: 's', html: '<p>x</p>' })).toEqual({ id: 'm1' })
    const { url, headers, body } = sent()
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(headers['api-key']).toBe(CMS_KEY)
    expect(body.sender).toEqual({ name: 'Monica', email: 'contact@exemple.test' })
  })

  it('la variable Vercel l\'emporte sur le CMS', async () => {
    vi.stubEnv('BREVO_API_KEY', VERCEL_KEY)
    vi.stubEnv('SENDER_EMAIL', 'vercel@exemple.test')
    kv = {
      secret_conn_brevo_api_key: encryptSecret(CMS_KEY, SECRET),
      conn_sender_email: 'contact@exemple.test',
    }
    await sendEmail({ to: 'a@exemple.test', subject: 's', html: '<p>x</p>' })
    const { headers, body } = sent()
    expect(headers['api-key']).toBe(VERCEL_KEY)
    expect(body.sender.email).toBe('vercel@exemple.test')
  })

  it('une clé du CMS devenue illisible (secret changé) : rien n\'est envoyé, pas d\'erreur', async () => {
    kv = { secret_conn_brevo_api_key: encryptSecret(CMS_KEY, 'ancien-secret-0123456789') }
    expect(await sendEmail({ to: 'a@exemple.test', subject: 's', html: '<p>x</p>' })).toEqual({ skipped: true })
  })
})
