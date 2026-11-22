import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { checkRedirects, normalizePath, normalizeTarget, parseRedirects, REDIRECTS_KEY, REDIRECTS_PAGE, MAX_REDIRECTS } from '@/lib/redirects'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET /api/cms/redirects : la liste enregistrée (session CMS requise)
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  const { data, error } = await supabase.from('site_content').select('value').eq('page', REDIRECTS_PAGE).eq('block_key', REDIRECTS_KEY).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: parseRedirects(data?.value) })
}

// PUT /api/cms/redirects  body : { rules: [{ from, to }] } : remplace la liste. Refusé si une règle est en erreur.
export async function PUT(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({})) as { rules?: unknown }
  if (!Array.isArray(body.rules) || body.rules.length > MAX_REDIRECTS) {
    return NextResponse.json({ error: `Liste invalide (maximum ${MAX_REDIRECTS} redirections).` }, { status: 400 })
  }
  const rules = body.rules
    .filter((r): r is { from: string; to: string } => !!r && typeof (r as { from?: unknown }).from === 'string' && typeof (r as { to?: unknown }).to === 'string')
    .map(r => ({ from: r.from, to: r.to }))
  const problems = checkRedirects(rules)
  const errors = problems.filter(p => p.level === 'error')
  if (errors.length) return NextResponse.json({ error: 'Redirections refusées', problems }, { status: 400 })

  const clean = rules.map(r => ({ from: normalizePath(r.from), to: normalizeTarget(r.to) }))
  const { error } = await supabase
    .from('site_content')
    .upsert({ page: REDIRECTS_PAGE, block_key: REDIRECTS_KEY, value: JSON.stringify(clean) }, { onConflict: 'page,block_key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, rules: clean, problems })
}
