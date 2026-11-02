import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { generateQuestionnaire, QuestionnaireAiError } from '@/lib/questionnaire-ai'

export const dynamic = 'force-dynamic'

// Génère un BROUILLON : rien n'est enregistré ici. L'admin relit, puis enregistre via POST /api/cms/questionnaires.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  const audience = typeof body?.audience === 'string' ? body.audience.trim().slice(0, 200) : undefined
  const category = typeof body?.category === 'string' ? body.category.trim().slice(0, 40) : undefined
  const questionCount = Number(body?.questionCount ?? 6)

  if (!topic || topic.length > 300) return NextResponse.json({ error: 'Sujet requis (300 caractères max).' }, { status: 422 })
  if (!Number.isInteger(questionCount) || questionCount < 3 || questionCount > 15) {
    return NextResponse.json({ error: 'Nombre de questions entre 3 et 15.' }, { status: 422 })
  }

  try {
    const result = await generateQuestionnaire({ topic, audience, category, questionCount })
    if (!result.ok) return NextResponse.json({ error: 'Brouillon IA invalide', details: result.errors }, { status: 422 })
    return NextResponse.json({ draft: result.value })
  } catch (e) {
    if (e instanceof QuestionnaireAiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Questionnaire AI generation failed', e)
    return NextResponse.json({ error: 'La génération a échoué. Réessayez.' }, { status: 502 })
  }
}
