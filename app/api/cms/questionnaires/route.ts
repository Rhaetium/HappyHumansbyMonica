import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import {
  normalizeQuestions,
  serializeQuestions,
  deserializeQuestions,
  sanitizeQuestionText,
  buildSlugFromTitle,
  type QuestionnaireTemplate,
} from '@/lib/questionnaires'

export const dynamic = 'force-dynamic'

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function nowIso() {
  return new Date().toISOString()
}

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  let query = sb.from('questionnaire_templates').select('*').order('updated_at', { ascending: false })

  if (slug) {
    query = query.eq('slug', slug).maybeSingle()
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (slug) {
    const template = data as Record<string, unknown> | null
    if (!template) return NextResponse.json({ error: 'Questionnaire introuvable' }, { status: 404 })
    return NextResponse.json({ template: normalizeTemplate(template) })
  }

  const templates = (data ?? []).map(normalizeTemplate)
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const {
    title,
    slug,
    description,
    intro_text,
    privacy_text,
    questions,
    anonymous = true,
    multi_step = false,
    progress_label = '',
    result_template,
  } = body as Record<string, unknown>

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title requis' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug.trim()) {
    return NextResponse.json({ error: 'slug requis' }, { status: 400 })
  }
  if (typeof intro_text !== 'string') {
    return NextResponse.json({ error: 'intro_text requis' }, { status: 400 })
  }
  if (typeof privacy_text !== 'string') {
    return NextResponse.json({ error: 'privacy_text requis' }, { status: 400 })
  }

  const normalized = normalizeQuestions(questions)
  if (normalized.length === 0) {
    return NextResponse.json({ error: 'Au moins une question est requise' }, { status: 400 })
  }

  const payload = {
    title: title.trim(),
    slug: slug.trim().toLowerCase(),
    description: description && typeof description === 'string' ? description : null,
    intro_text: sanitizeQuestionText(intro_text.trim()),
    privacy_text: sanitizeQuestionText(privacy_text.trim()),
    questions: serializeQuestions(normalized),
    anonymous: Boolean(anonymous),
    multi_step: Boolean(multi_step),
    progress_label: String(progress_label || ''),
    result_template: result_template && typeof result_template === 'object' ? result_template : null,
    updated_at: nowIso(),
  }

  // Si le slug existe déjà avec un ID différent, on refuse la création (conflit de slug).
  let { data: existing } = await sb
    .from('questionnaire_templates')
    .select('id, slug')
    .eq('slug', payload.slug)
    .maybeSingle()

  if (existing && existing.id !== body.id) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé par un autre questionnaire' }, { status: 409 })
  }

  let result
  let error
  if (existing) {
    ;({ data: result, error } = await sb
      .from('questionnaire_templates')
      .update({ ...payload, updated_at: nowIso() })
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ;({ data: result, error } = await sb
      .from('questionnaire_templates')
      .insert({ ...payload, created_at: nowIso(), updated_at: nowIso() })
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!result) return NextResponse.json({ error: 'Questionnaire introuvable après écriture' }, { status: 404 })
  return NextResponse.json({ template: normalizeTemplate(result) }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { data: existing } = await sb
    .from('questionnaire_templates')
    .select('id')
    .eq('slug', slug.trim().toLowerCase())
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Questionnaire introuvable' }, { status: 404 })
  }

  const { error } = await sb.from('questionnaire_templates').delete().eq('id', existing.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

function normalizeTemplate(row: Record<string, unknown>): QuestionnaireTemplate {
  return {
    id: String(row.id ?? ''),
    title: sanitizeQuestionText(String(row.title ?? '')),
    slug: String(row.slug ?? ''),
    description: row.description != null ? sanitizeQuestionText(String(row.description)) : undefined,
    intro_text: sanitizeQuestionText(String(row.intro_text ?? '')),
    privacy_text: sanitizeQuestionText(String(row.privacy_text ?? '')),
    questions: deserializeQuestions(String(row.questions ?? '')),
    anonymous: Boolean(row.anonymous),
    multi_step: Boolean(row.multi_step),
    progress_label: String(row.progress_label ?? ''),
    result_template: row.result_template && typeof row.result_template === 'object' ? row.result_template as Record<string, unknown> : undefined,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}
