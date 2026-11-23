import { NextRequest, NextResponse } from 'next/server'
import { isValidCmsPassword, requireCmsAuth } from '@/lib/cms-auth'
import { clearFailures, clientKey, recordFailure, retryAfterSeconds } from '@/lib/rate-limit'
import { secretBoxSecret } from '@/lib/secret-box'
import { consumeRecoveryCode, formatSecret, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, otpauthUri, verifyTotp } from '@/lib/totp'
import { deleteTwoFactor, readPending, readTwoFactor, savePending, saveTwoFactor, twoFactorForcedOff } from '@/lib/two-factor-store'

export const dynamic = 'force-dynamic'

// GET  /api/cms/two-factor            → état (activée ?, codes de secours restants)
// POST /api/cms/two-factor {action}   → start | confirm {code} | disable {password, code}
// Toutes les actions exigent une session CMS ouverte.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const read = await readTwoFactor()
  return NextResponse.json({
    available: !!secretBoxSecret(),
    forcedOff: twoFactorForcedOff(),
    enabled: read.status === 'on',
    unreadable: read.status === 'error',
    recoveryLeft: read.status === 'on' ? read.state.recovery.length : 0,
  })
}

export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { action?: unknown; code?: unknown; password?: unknown } | null
  const action = body?.action
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const secret = secretBoxSecret()
  if (!secret) return NextResponse.json({ error: 'Configuration incomplète (CMS_SESSION_SECRET manquant).' }, { status: 503 })

  const key = clientKey(req.headers)
  const wait = retryAfterSeconds(key)
  if (wait > 0) return NextResponse.json({ error: 'Trop d’essais. Réessayez dans quelques minutes.' }, { status: 429, headers: { 'Retry-After': String(wait) } })

  const current = await readTwoFactor()
  if (current.status === 'error') return NextResponse.json({ error: current.reason }, { status: 503 })

  if (action === 'start') {
    if (current.status === 'on') return NextResponse.json({ error: 'La double authentification est déjà activée.' }, { status: 409 })
    const totp = generateTotpSecret()
    if (!(await savePending(totp))) return NextResponse.json({ error: 'Enregistrement impossible. Réessayez.' }, { status: 500 })
    return NextResponse.json({ key: formatSecret(totp), uri: otpauthUri(totp, 'Monica') })
  }

  if (action === 'confirm') {
    if (current.status === 'on') return NextResponse.json({ error: 'La double authentification est déjà activée.' }, { status: 409 })
    const pending = await readPending()
    if (!pending) return NextResponse.json({ error: 'Recommencez : la clé n’est plus disponible.' }, { status: 400 })
    if (!verifyTotp(pending, code)) {
      recordFailure(key)
      return NextResponse.json({ error: 'Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.' }, { status: 400 })
    }
    const recoveryCodes = generateRecoveryCodes()
    const ok = await saveTwoFactor({ secret: pending, recovery: recoveryCodes.map(c => hashRecoveryCode(c, secret)), enabledAt: new Date().toISOString() })
    if (!ok) return NextResponse.json({ error: 'Enregistrement impossible. Réessayez.' }, { status: 500 })
    clearFailures(key)
    // Les codes de secours ne sont montrés qu'ici, une seule fois : seules leurs empreintes sont conservées
    return NextResponse.json({ enabled: true, recoveryCodes })
  }

  if (action === 'disable') {
    if (current.status !== 'on') return NextResponse.json({ error: 'La double authentification n’est pas activée.' }, { status: 409 })
    const password = typeof body?.password === 'string' ? body.password : ''
    const codeOk = verifyTotp(current.state.secret, code) || consumeRecoveryCode(current.state.recovery, code, secret) !== null
    if (!isValidCmsPassword(password) || !codeOk) {
      recordFailure(key)
      return NextResponse.json({ error: 'Mot de passe ou code incorrect.' }, { status: 400 })
    }
    if (!(await deleteTwoFactor())) return NextResponse.json({ error: 'Désactivation impossible. Réessayez.' }, { status: 500 })
    clearFailures(key)
    return NextResponse.json({ enabled: false })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
