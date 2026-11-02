import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getQuestionnaireDb, DB_NOT_CONFIGURED } from '@/lib/questionnaires-db'
import {
  filterSubmissions,
  parseSubmissionFilters,
  submissionsToCsv,
  type Question,
  type SubmissionRow,
} from '@/lib/questionnaires'

export const dynamic = 'force-dynamic'

// Plafond de lecture : au-delà, l'export doit être découpé par période.
const MAX_ROWS = 5000

// GET /api/cms/questionnaires/:id/submissions?participant=…&from=AAAA-MM-JJ&to=AAAA-MM-JJ&format=csv
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const db = getQuestionnaireDb()
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 })
  const { id } = await params

  const { data: questionnaire, error: qError } = await db
    .from('questionnaires')
    .select('id, title, questions')
    .eq('id', id)
    .maybeSingle()
  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 })
  if (!questionnaire) return NextResponse.json({ error: 'Questionnaire introuvable.' }, { status: 404 })

  const { data, error } = await db
    .from('questionnaire_submissions')
    .select('id, participant_name, participant_email, answers, submitted_at')
    .eq('questionnaire_id', id)
    .order('submitted_at', { ascending: false })
    .limit(MAX_ROWS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filters = parseSubmissionFilters(req.nextUrl.searchParams)
  const rows = filterSubmissions((data ?? []) as SubmissionRow[], filters)
  const questions = questionnaire.questions as Question[]

  if (req.nextUrl.searchParams.get('format') === 'csv') {
    return new NextResponse(submissionsToCsv(questions, rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reponses-${id}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({
    questionnaire: { id: questionnaire.id, title: questionnaire.title, questions },
    filters,
    count: rows.length,
    truncated: (data?.length ?? 0) >= MAX_ROWS,
    submissions: rows,
  })
}
