import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server'
import { isAiCrawler, sendCrawlerLog } from '@/lib/ai-crawler-log'
import { resolveRedirect } from '@/lib/redirects'
import { getRedirects } from '@/lib/redirects-store'

function getSecret(): string {
  return (
    process.env.CMS_HMAC_SECRET?.trim() ||
    process.env.CMS_SESSION_SECRET?.trim() ||
    process.env.CMS_PASSWORD?.trim() ||
    ''
  )
}

function hex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const expected = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data))))
    return expected === signature
  } catch { return false }
}

const b64url = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const EDIT_SESSION_SECONDS = 2 * 60 * 60

async function hmacHex(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data))))
}

// Session d'édition : jeton signé { kind, iat, exp } — vérifié côté serveur par lib/cms-auth.ts (verifyEditSession)
async function createEditSession(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({ kind: 'edit-session', iat: now, exp: now + EDIT_SESSION_SECONDS }))
  return `${payload}.${await hmacHex(payload, secret)}`
}

async function isValidEditSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !(await verifySignature(payload, signature, secret))) return false
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return data?.kind === 'edit-session' && typeof data.exp === 'number' && Math.floor(Date.now() / 1000) < data.exp
  } catch { return false }
}

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  // Redirections gérées dans l'admin (onglet « Redirections ») : pages et articles renommés. Seulement pour une page
  // consultée (GET/HEAD), jamais pour l'API, l'admin ni les fichiers (adresse avec une extension).
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.nextUrl.pathname.includes('.')) {
    const to = resolveRedirect(await getRedirects(), req.nextUrl.pathname, req.nextUrl.search)
    if (to) return NextResponse.redirect(/^https:\/\//i.test(to) ? to : new URL(to, req.url), 301)
  }

  const res = NextResponse.next()

  // Suivi des robots IA (GPTBot, ClaudeBot…) : n'agit que pour eux, après la réponse, et seulement si le jeton est configuré
  if (isAiCrawler(req.headers.get('user-agent'))) event.waitUntil(sendCrawlerLog(req))

  // Check ?cms_edit_token=... param (passed from CMS admin via generate-edit-token)
  const tokenFromParam = req.nextUrl.searchParams.get('cms_edit_token')
  if (tokenFromParam) {
    const secret = getSecret()
    const parts = tokenFromParam.split('.')
    const valid = parts.length === 2 && !!secret && (await verifySignature(parts[0], parts[1], secret))

    if (valid) {
      try {
        const payload = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload?.exp && Math.floor(Date.now() / 1000) < payload.exp) {
          const url = req.nextUrl.clone()
          url.searchParams.delete('cms_edit_token')
          const redirectRes = NextResponse.redirect(url)
          const secure = process.env.NODE_ENV === 'production'
          // Session d'édition SIGNÉE, illisible par JavaScript : c'est elle qui donne l'accès côté serveur
          redirectRes.cookies.set('hh_cms_edit', await createEditSession(secret), {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: EDIT_SESSION_SECONDS,
            path: '/',
          })
          // Indicateur d'affichage seulement (bouton « Éditer ») : fabriquable par n'importe qui, ne donne aucun accès
          redirectRes.cookies.set('hh_cms_ui', '1', { httpOnly: false, sameSite: 'lax', secure, maxAge: EDIT_SESSION_SECONDS, path: '/' })
          return redirectRes
        }
      } catch { /* invalid payload */ }
    }
    // Token invalid — redirect without setting cookie
    const url = req.nextUrl.clone()
    url.searchParams.delete('cms_edit_token')
    return NextResponse.redirect(url)
  }

  // Session d'édition valide (signature + expiration vérifiées) : on le signale, sans jamais se fier à la seule présence du cookie
  if (await isValidEditSession(req.cookies.get('hh_cms_edit')?.value, getSecret())) {
    res.headers.set('x-cms-edit', '1')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
