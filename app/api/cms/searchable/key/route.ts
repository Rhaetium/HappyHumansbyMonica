import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getKvSettings } from '@/lib/cms-settings-server'
import { SearchableError, callTool } from '@/lib/searchable-api'
import {
  SearchableKeyError,
  clearSearchableKey,
  isValidSearchableKey,
  saveSearchableKey,
  searchableKeyStatus,
} from '@/lib/searchable-key'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const status = async () => NextResponse.json(searchableKeyStatus(await getKvSettings(), process.env), { headers: NO_STORE })

// État de la clé : configurée ou non, et d'où elle vient. Ne renvoie JAMAIS la valeur.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  return status()
}

// Corps : { key: "sea_…" }. La clé est testée auprès de Searchable avant d'être enregistrée (chiffrée).
export async function PUT(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { key?: unknown } | null
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  if (!isValidSearchableKey(key)) {
    return NextResponse.json({ error: 'Cette clé n’a pas le bon format : elle commence par « sea_ ».' }, { status: 422 })
  }
  try {
    await callTool(key, 'list_projects') // refuse une clé fausse avant de l'enregistrer
    await saveSearchableKey(key)
  } catch (e) {
    if (e instanceof SearchableKeyError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof SearchableError) return NextResponse.json({ error: e.message, hint: e.hint }, { status: e.status === 401 ? 422 : 502 })
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }
  return status()
}

// Retire la clé enregistrée dans le CMS (celle de Vercel n'est pas touchée).
export async function DELETE(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  try {
    await clearSearchableKey()
  } catch (e) {
    return NextResponse.json({ error: e instanceof SearchableKeyError ? e.message : 'Suppression impossible.' }, { status: e instanceof SearchableKeyError ? e.status : 500 })
  }
  return status()
}
