import { NextResponse } from 'next/server'
import {
  clearCmsSessionResponse,
  createCmsSessionResponse,
  getCmsAuthStatus,
  isValidCmsPassword,
} from "@/lib/cms-auth"
import { clearFailures, clientKey, recordFailure, retryAfterSeconds } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Corps illisible : une réponse claire plutôt qu'une erreur serveur.
  const body = await req.json().catch(() => null) as { password?: unknown } | null
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!process.env.CMS_PASSWORD?.trim()) {
    return NextResponse.json(
      { error: "CMS non configuré : variable CMS_PASSWORD manquante." },
      { status: 503 }
    )
  }

  // Trop d'essais ratés depuis cette adresse : on refuse sans même comparer le mot de passe.
  const key = clientKey(req.headers)
  const wait = retryAfterSeconds(key)
  if (wait > 0) {
    return NextResponse.json(
      { error: `Trop d'essais. Réessayez dans ${Math.ceil(wait / 60)} minute${wait > 120 ? 's' : ''}.` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }

  if (!isValidCmsPassword(password)) {
    recordFailure(key)
    return clearCmsSessionResponse(401, { error: "Mot de passe incorrect" })
  }

  clearFailures(key)
  return createCmsSessionResponse()
}

// GET /api/cms/auth — { ok: true } si la session est valide.
// Le jeton de session n'est PAS renvoyé : il vit dans un cookie httpOnly, illisible par un script de la page.
// (Le lien « Éditer le site » utilise un jeton distinct, de 5 min : /api/cms/generate-edit-token.)
export async function GET(req: Request) {
  const status = getCmsAuthStatus(req)

  if (status === "misconfigured") {
    return NextResponse.json({ ok: false, error: "CMS non configuré" }, { status: 503 })
  }

  if (status !== "ok") return NextResponse.json({ ok: false }, { status: 401 })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  return clearCmsSessionResponse()
}

// (Supprimé : PUT, public, qui révélait la longueur du mot de passe.)
