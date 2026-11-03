export interface PublicQuestionnaireSubmitRequest {
  template_id: string
  answers: Record<string, unknown>
  email?: string
}

export interface PublicQuestionnaireSubmitResponse {
  success: boolean
  attempt?: {
    id: string
    template_id: string
    created_at: string
    result?: Record<string, unknown>
  }
  error?: string
}

export function validateSubmitRequest(
  req: Partial<PublicQuestionnaireSubmitRequest>
): PublicQuestionnaireSubmitRequest | null {
  if (!req.template_id || typeof req.template_id !== 'string') return null
  if (!req.answers || typeof req.answers !== 'object' || Array.isArray(req.answers)) return null
  const email = req.email && typeof req.email === 'string' && req.email.trim()
  return {
    template_id: req.template_id,
    answers: req.answers as Record<string, unknown>,
    ...(email ? { email: email.trim() } : {}),
  }
}

export async function submitPublicQuestionnaire(req: PublicQuestionnaireSubmitRequest): Promise<PublicQuestionnaireSubmitResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { success: false, error: 'Service unavailable' }

  const sb = createClient(url, key)
  const { data: template, error: templateError } = await sb
    .from('questionnaire_templates')
    .select('*')
    .eq('id', req.template_id)
    .maybeSingle()

  if (templateError || !template) {
    return { success: false, error: 'Questionnaire introuvable' }
  }

  const questionsJson = template.questions
  if (!questionsJson || typeof questionsJson !== 'string') {
    return { success: false, error: 'Questionnaire invalide' }
  }

  let questions: Array<Record<string, unknown>>
  try {
    questions = JSON.parse(questionsJson)
  } catch {
    return { success: false, error: 'Questionnaire invalide' }
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return { success: false, error: 'Questionnaire vide' }
  }

  const now = new Date().toISOString()
  const payload = {
    template_id: req.template_id,
    started_at: now,
    completed_at: now,
    answers: req.answers,
    email: req.email ?? null,
    result: null,
    user_agent: null,
    ip_hash: null,
    created_at: now,
  }

  const { data: attempt, error: insertError } = await sb
    .from('questionnaire_attempts')
    .insert(payload)
    .select('id, template_id, created_at, result')
    .single()

  if (insertError || !attempt) {
    return { success: false, error: 'Impossible d’enregistrer la réponse' }
  }

  return {
    success: true,
    attempt: {
      id: attempt.id,
      template_id: attempt.template_id,
      created_at: attempt.created_at,
      result: attempt.result,
    },
  }
}
