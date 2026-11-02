import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getQuestionnaireDb, DB_NOT_CONFIGURED } from '@/lib/questionnaires-db'
import { validateQuestionnaire } from '@/lib/questionnaires'

export const dynamic = 'force-dynamic'

// Liste des questionnaires, avec le nombre de réponses reçues par questionnaire.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })

  const [{ data: questionnaires, error }, { data: counts, error: countError }] = await Promise.all([
    db.from('questionnaires').select('*').order('created_at', { ascending: false }),
    db.from('questionnaire_submissions').select('questionnaire_id'),
  ])
  if (error || countError) return NextResponse.json({ error: (error ?? countError)!.message }, { status: 500 })

  const tally: Record<string, number> = {}
  for (const row of counts ?? []) tally[row.questionnaire_id] = (tally[row.questionnaire_id] ?? 0) + 1

  return NextResponse.json({
    questionnaires: (questionnaires ?? []).map(q => ({ ...q, submission_count: tally[q.id] ?? 0 })),
  })
}

// Création d'un questionnaire (brouillon validé côté serveur).
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })

  const parsed = validateQuestionnaire(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: 'Questionnaire invalide', details: parsed.errors }, { status: 422 })

  const { data, error } = await db.from('questionnaires').insert(parsed.value).select().single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Cette adresse (slug) existe déjà.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ questionnaire: data }, { status: 201 })
}
