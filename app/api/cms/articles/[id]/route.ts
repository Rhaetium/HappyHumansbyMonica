import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { scheduleIndexNow } from '@/lib/indexnow'
import { isArticleLive } from '@/lib/article-schedule'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function withoutVoiceNotes(payload: Record<string, unknown>) {
  const { voice_notes, ...rest } = payload
  return rest
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  const { data, error } = await sb
    .from('cms_blog_posts')
    .select('*')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ article: data })
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  const body = await req.json()
  const payload = { ...body, updated_at: new Date().toISOString() }

  let { data, error } = await sb
    .from('cms_blog_posts')
    .update(payload)
    .eq('id', params.id)
    .select()
    .single()

  if (error?.message?.includes('voice_notes') && error.message.includes('does not exist')) {
    ;({ data, error } = await sb
      .from('cms_blog_posts')
      .update(withoutVoiceNotes(payload))
      .eq('id', params.id)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Article en ligne (publié ou modifié) : on prévient Bing & co. après la réponse
  if (data && isArticleLive(data) && data.slug) scheduleIndexNow([`/blog/${data.slug}`, '/blog'])
  return NextResponse.json({ article: data })
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const sb = supabase()
  const { data: before } = await sb.from('cms_blog_posts').select('slug, published').eq('id', params.id).single()
  const { error } = await sb.from('cms_blog_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Article supprimé : on le signale aussi (les moteurs retirent la page plus vite)
  if (before?.published && before?.slug) scheduleIndexNow([`/blog/${before.slug}`, '/blog'])
  return NextResponse.json({ ok: true })
}
