import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'

export const dynamic = 'force-dynamic'

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '14', 10) || 14, 60)
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

  // Templates
  const { data: templates, error: templatesError } = await sb
    .from('questionnaire_templates')
    .select('id, slug, title, updated_at')
    .order('updated_at', { ascending: false })

  if (templatesError) {
    return NextResponse.json({ error: templatesError.message }, { status: 500 })
  }

  // Récap journalier depuis la vue matérialisée
  const { data: summary, error: summaryError } = await sb
    .from('questionnaire_daily_summary')
    .select('day, template_id, total_attempts, completed_attempts, attempts_today, completed_today')
    .order('day', { ascending: false })
    .limit(limit)

  if (summaryError) {
    // La vue peut ne pas exister encore si la migration n’est pas appliquée.
    return NextResponse.json({ error: summaryError.message }, { status: 500 })
  }

  // Aggrégats globaux simples (pas de JOIN nécessaire pour le premier MVP).
  const { count: todayAttempts, error: attemptsError } = await sb
    .from('questionnaire_attempts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart)

  const dayMap = new Map<string, typeof summary[number]>()
  for (const row of (summary ?? [])) {
    dayMap.set(`${row.day}|${row.template_id}`, row)
  }

  const byTemplate = templates?.map(t => {
    const templateSummaries = (summary ?? []).filter(row => row.template_id === t.id)
    const totalAttempts = (templateSummaries.reduce((acc, row) => acc + (row.total_attempts ?? 0), 0))
    const totalCompleted = (templateSummaries.reduce((acc, row) => acc + (row.completed_attempts ?? 0), 0))
    const lastDay = templateSummaries[0]
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      updated_at: t.updated_at,
      attempts: totalAttempts,
      completed: totalCompleted,
      attempts_today: lastDay?.attempts_today ?? 0,
      completed_today: lastDay?.completed_today ?? 0,
    }
  }) ?? []

  return NextResponse.json({
    templates,
    summary: summary ?? [],
    today_attempts: attemptsError ? 0 : (todayAttempts ?? 0),
    by_template: byTemplate,
  })
}

export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  // Rafraîchissement manuel du récap journalier (utile si la vue n'est pas refreshée automatiquement).
  const { refresh } = await req.json().catch(() => ({ refresh: false }))

  if (refresh) {
    // REFRESH CONCURRENTLY nécessite un index unique, présent dans la migration.
    try {
      await sb.rpc('refresh_questionnaire_daily_summary')
      return NextResponse.json({ refreshed: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'refresh impossible'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'action inconnue' }, { status: 400 })
}
