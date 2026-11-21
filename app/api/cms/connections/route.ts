import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getKvSettings } from '@/lib/cms-settings-server'
import {
  ConnectionsError, clearConnectionValues, connectionById, connectionsStatus, saveConnectionValues,
  validateConnectionValues, verifyBrevoKey,
} from '@/lib/connections'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const fail = (e: unknown) =>
  e instanceof ConnectionsError
    ? NextResponse.json({ error: e.message }, { status: e.status })
    : NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
const status = async () => NextResponse.json(connectionsStatus(await getKvSettings(), process.env), { headers: NO_STORE })

// État des connexions : configurées ou non, et d'où vient chaque valeur. Ne renvoie JAMAIS la valeur d'un secret.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  return status()
}

// Corps : { connection, values: { NOM_DE_VARIABLE: "valeur" } }. Un champ vide reste inchangé.
// Une clé Brevo est testée auprès de Brevo avant d'être enregistrée (chiffrée).
export async function PUT(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { connection?: unknown; values?: unknown } | null
  const connection = connectionById(String(body?.connection ?? ''))
  if (!connection) return NextResponse.json({ error: 'Connexion inconnue.' }, { status: 400 })
  if (!body?.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const checked = validateConnectionValues(connection, body.values as Record<string, unknown>)
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 422 })
  if (Object.keys(checked.values).length === 0) return NextResponse.json({ error: 'Aucune valeur à enregistrer.' }, { status: 422 })

  if (checked.values.BREVO_API_KEY) {
    const verdict = await verifyBrevoKey(checked.values.BREVO_API_KEY)
    if (verdict === 'invalid') return NextResponse.json({ error: 'Brevo refuse cette clé. Vérifiez-la dans Brevo (SMTP et API → Clés API).' }, { status: 422 })
    if (verdict === 'unreachable') return NextResponse.json({ error: 'Impossible de vérifier la clé auprès de Brevo pour le moment. Réessayez dans quelques minutes.' }, { status: 502 })
  }

  try {
    await saveConnectionValues(connection.id, checked.values)
  } catch (e) {
    return fail(e)
  }
  return status()
}

// Retire les valeurs enregistrées dans l'admin pour une connexion (?connection=email). Celles de Vercel ne sont pas touchées.
export async function DELETE(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  try {
    await clearConnectionValues(req.nextUrl.searchParams.get('connection') ?? '')
  } catch (e) {
    return fail(e)
  }
  return status()
}
