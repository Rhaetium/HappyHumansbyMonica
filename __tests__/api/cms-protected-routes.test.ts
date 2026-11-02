// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'

/**
 * Routes d'administration ouvertes à tout le monde.
 *
 * Avant : /api/send-email (relais d'e-mails ouvert : envoi vers n'importe quelle adresse depuis l'expéditeur du site),
 * /api/instagram/post (publication sur le compte Instagram) et les routes de génération IA (quota Groq) répondaient
 * sans aucune authentification. Ces tests les verrouillent, et un garde-fou impose une décision explicite
 * pour toute NOUVELLE route API.
 */

const root = path.resolve(__dirname, '../..')

beforeAll(() => { process.env.CMS_PASSWORD = 'mot-de-passe-de-test' })

const anon = (method: string) => new NextRequest('http://localhost/api/x', { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })

const PROTECTED: [string, string, string][] = [
  ['send-email', '@/app/api/send-email/route', 'POST'],
  ['instagram/post', '@/app/api/instagram/post/route', 'POST'],
  ['instagram/post', '@/app/api/instagram/post/route', 'GET'],
  ['ai/generate', '@/app/api/ai/generate/route', 'POST'],
  ['ai/generate', '@/app/api/ai/generate/route', 'GET'],
  ['blog/generate', '@/app/api/blog/generate/route', 'POST'],
  ['carousel/generate', '@/app/api/carousel/generate/route', 'POST'],
  ['test-upload', '@/app/api/test-upload/route', 'GET'],
]

describe('routes d’administration : refusées sans authentification', () => {
  it.each(PROTECTED)('/api/%s %s → 401', async (_name, mod, method) => {
    const handler = (await import(/* @vite-ignore */ mod))[method]
    const res = await handler(anon(method))
    expect(res.status).toBe(401)
  })

  it('le cookie fabriqué « hh_cms_edit=1 » ne les ouvre pas non plus', async () => {
    const { POST } = await import('@/app/api/send-email/route')
    const res = await POST(new NextRequest('http://localhost/api/send-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'hh_cms_edit=1' },
      body: JSON.stringify({ type: 'admin', to: 'victime@example.com', data: { name: 'x' } }),
    }))
    expect(res.status).toBe(401)
  })
})

// ── Garde-fou : toute route API doit être protégée OU figurer ici, avec la raison ──────────────────────────────
const PUBLIC_ROUTES: Record<string, string> = {
  '/api/booking': 'formulaire public de réservation (liste des créneaux + demande)',
  '/api/contact': 'formulaire de contact public',
  '/api/newsletter': 'inscription publique à la newsletter',
  '/api/brevo/subscribe': 'inscription publique à la newsletter (Brevo)',
  '/api/cms/auth': 'connexion à l’admin (c’est elle qui authentifie)',
  '/api/cms/public-articles': 'lecture publique des articles publiés',
  '/api/cms/public-settings': 'lecture publique des réglages d’affichage',
  '/api/cms/public-temoignages': 'lecture publique des témoignages',
  '/api/cms/public-content': 'lecture publique du contenu ; les brouillons exigent une session (preview)',
  '/api/keep-alive': 'cron Vercel qui garde la base active',
  '/api/cms-html': 'page HTML statique d’information',
  '/api/questionnaires/[slug]': 'lecture publique d’un questionnaire actif (QR code) ; aucune réponse exposée',
  '/api/questionnaires/[slug]/submit': 'envoi public des réponses d’un questionnaire actif ; tout est revalidé côté serveur',
}

function routeFiles(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) routeFiles(p, out)
    else if (/^route\.(ts|js)$/.test(e.name)) out.push(p)
  }
  return out
}

describe('garde-fou : aucune route API ouverte sans décision explicite', () => {
  const files = routeFiles(path.join(root, 'app/api'))
  it.each(files.map(f => ['/api' + f.slice(path.join(root, 'app/api').length).replace(/\\/g, '/').replace(/\/route\.(ts|js)$/, ''), f]))(
    '%s',
    (route, file) => {
      const src = fs.readFileSync(file, 'utf8')
      const guarded = /requireCmsAuth|getCmsAuthStatus|verifyEditSession|isValidCmsPassword/.test(src)
      const allowed = route in PUBLIC_ROUTES
      expect(
        guarded || allowed,
        `${route} n'est ni protégée (requireCmsAuth) ni déclarée publique. Protégez-la, ou ajoutez-la à PUBLIC_ROUTES avec la raison.`,
      ).toBe(true)
    },
  )
})
