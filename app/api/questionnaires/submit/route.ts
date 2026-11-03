import { NextRequest, NextResponse } from 'next/server'
import {
  submitPublicQuestionnaire,
  validateSubmitRequest,
} from '@/lib/questionnaires-public'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const validated = validateSubmitRequest(body as Partial<Parameters<typeof submitPublicQuestionnaire>[0]>)
  if (!validated) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const result = await submitPublicQuestionnaire(validated)
  if (result.success) {
    return NextResponse.json(result, { status: 201 })
  }

  const status = result.error === 'Questionnaire introuvable' ? 404 : 400
  return NextResponse.json({ error: result.error }, { status })
}
