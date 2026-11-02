import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getQuestionnaireDb, DB_NOT_CONFIGURED } from '@/lib/questionnaires-db'
import { validateQuestionnaire } from '@/lib/questionnaires'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })
  const { id } = await params

  const { data, error } = await db.from('questionnaires').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Questionnaire introuvable.' }, { status: 404 })
  return NextResponse.json({ questionnaire: data })
}

// Mise à jour complète (le formulaire renvoie tout le questionnaire).
export async function PUT(req: NextRequest, { params }: Ctx) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })
  const { id } = await params

  const parsed = validateQuestionnaire(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: 'Questionnaire invalide', details: parsed.errors }, { status: 422 })

  const { data, error } = await db
    .from('questionnaires')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Cette adresse (slug) existe déjà.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Questionnaire introuvable.' }, { status: 404 })
  return NextResponse.json({ questionnaire: data })
}

// Suppression : les réponses associées partent avec (ON DELETE CASCADE).
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })
  const { id } = await params

  const { error } = await db.from('questionnaires').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
