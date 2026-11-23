import { NextResponse } from 'next/server'
import {
  clearCmsSessionResponse,
  createCmsSessionResponse,
  getCmsAuthStatus,
  isValidCmsPassword,
} from "@/lib/cms-auth"
import { clearFailures, clientKey, recordFailure, retryAfterSeconds } from '@/lib/rate-limit'
import { readTwoFactor, saveTwoFactor } from '@/lib/two-factor-store'
import { consumeRecoveryCode, verifyTotp } from '@/lib/totp'
import { secretBoxSecret } from '@/lib/secret-box'

export async function POST(req: Request) {
  // Corps illisible : une réponse claire plutôt qu'une erreur serveur.
  const body = await req.json().catch(() => null) as { password?: unknown; code?: unknown } | null
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

  // Double authentification (si Monica l'a activée) : le mot de passe seul ne suffit plus.
  const twoFactor = await readTwoFactor()
  if (twoFactor.status === 'error') {
    // Par prudence on refuse plutôt que de laisser passer sans le second facteur (voir CMS_2FA_DISABLE pour débloquer).
    return clearCmsSessionResponse(503, { error: `Vérification en deux étapes indisponible. ${twoFactor.reason} Réessayez dans un instant.` })
  }
  if (twoFactor.status === 'on') {
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code) {
      // Mot de passe juste, code pas encore saisi : ce n'est pas un échec (le compteur ne bouge pas)
      return clearCmsSessionResponse(401, { error: 'Entrez le code à 6 chiffres de votre application.', needsCode: true })
    }
    const secret = secretBoxSecret()
    let ok = verifyTotp(twoFactor.state.secret, code)
    if (!ok && secret) {
      // Code de secours : valable une seule fois, retiré dès qu'il sert
      const left = consumeRecoveryCode(twoFactor.state.recovery, code, secret)
      if (left) {
        ok = await saveTwoFactor({ ...twoFactor.state, recovery: left })
      }
    }
    if (!ok) {
      recordFailure(key) // deviner un code compte comme un essai raté
      return clearCmsSessionResponse(401, { error: 'Code incorrect.', needsCode: true })
    }
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
