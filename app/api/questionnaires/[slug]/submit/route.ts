import { NextResponse } from 'next/server'
import { getQuestionnaireDb, DB_NOT_CONFIGURED } from '@/lib/questionnaires-db'
import { validateAnswers, validateParticipant, type Question } from '@/lib/questionnaires'

export const dynamic = 'force-dynamic'

// Envoi d'une réponse. Tout est revalidé ici : le navigateur n'est jamais cru sur parole.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  const { data: questionnaire, error } = await db
    .from('questionnaires')
    .select('id, questions')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!questionnaire) return NextResponse.json({ error: 'Questionnaire introuvable.' }, { status: 404 })

  const answers = validateAnswers(questionnaire.questions as Question[], body.answers)
  const participant = validateParticipant(body.participant)
  const errors = [...(answers.ok ? [] : answers.errors), ...(participant.ok ? [] : participant.errors)]
  if (errors.length) return NextResponse.json({ error: 'Réponses invalides', details: errors }, { status: 422 })

  const { error: insertError } = await db.from('questionnaire_submissions').insert({
    questionnaire_id: questionnaire.id,
    participant_name: participant.ok ? participant.value.name : null,
    participant_email: participant.ok ? participant.value.email : null,
    answers: answers.ok ? answers.value : {},
  })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
