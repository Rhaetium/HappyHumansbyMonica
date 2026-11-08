import { NextResponse } from 'next/server'
import { getQuestionnaireDb, DB_NOT_CONFIGURED } from '@/lib/questionnaires-db'

export const dynamic = 'force-dynamic'

// Questionnaire public : seulement s'il est actif. Aucune réponse n'est exposée.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })

  const { data, error } = await db
    .from('questionnaires')
    .select('slug, title, description, questions')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Questionnaire introuvable.' }, { status: 404 })
  return NextResponse.json({ questionnaire: data }, { headers: { 'Cache-Control': 'no-store' } })
}
