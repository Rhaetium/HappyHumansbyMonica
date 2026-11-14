import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getKvSettings } from '@/lib/cms-settings-server'
import { providerById, validateProviderValues } from '@/lib/ai-providers'
import { AiKeysError, aiKeysStatus, clearProviderValues, savePreferredProvider, saveProviderValues } from '@/lib/ai-keys'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const fail = (e: unknown) =>
  e instanceof AiKeysError
    ? NextResponse.json({ error: e.message }, { status: e.status })
    : NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })

// État des fournisseurs d'IA : configurés ou non, et d'où vient la clé. Ne renvoie JAMAIS la valeur d'une clé.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  return NextResponse.json(aiKeysStatus(await getKvSettings(), process.env), { headers: NO_STORE })
}

// Corps : { provider, values: { NOM_DE_VARIABLE: "valeur" } } pour enregistrer une clé,
//         ou { preferred: "gemini" | "" } pour choisir le fournisseur préféré ("" = automatique).
export async function PUT(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { provider?: string; values?: Record<string, unknown>; preferred?: string } | null
  if (!body) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  try {
    if (typeof body.preferred === 'string') {
      await savePreferredProvider(body.preferred)
    } else {
      const provider = providerById(String(body.provider ?? ''))
      if (!provider) return NextResponse.json({ error: 'Fournisseur inconnu.' }, { status: 400 })
      const checked = validateProviderValues(provider, body.values ?? {})
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 422 })
      if (Object.keys(checked.values).length === 0) return NextResponse.json({ error: 'Aucune valeur à enregistrer.' }, { status: 422 })
      await saveProviderValues(provider.id, checked.values)
    }
  } catch (e) {
    return fail(e)
  }
  return NextResponse.json(aiKeysStatus(await getKvSettings(), process.env), { headers: NO_STORE })
}

// Retire les valeurs enregistrées dans l'admin pour un fournisseur (?provider=gemini). Celles de Vercel ne sont pas touchées.
export async function DELETE(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  try {
    await clearProviderValues(req.nextUrl.searchParams.get('provider') ?? '')
  } catch (e) {
    return fail(e)
  }
  return NextResponse.json(aiKeysStatus(await getKvSettings(), process.env), { headers: NO_STORE })
}
