import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { buildExport, exportFileName } from '@/lib/cms-export'

// GET /api/cms/export : sauvegarde complète du contenu du CMS (téléchargement). Réservé à l'administration ; sans secrets.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  const supabase = createClient(url, key)

  const [content, settings, articles] = await Promise.all([
    supabase.from('site_content').select('page, block_key, value').order('page').order('block_key'),
    supabase.from('cms_settings_kv').select('key, value').order('key'),
    supabase.from('cms_blog_posts').select('*').order('id'),
  ])
  const failed = content.error || settings.error || articles.error
  if (failed) return NextResponse.json({ error: failed.message }, { status: 500 })

  const now = new Date()
  const body = buildExport({ content: content.data ?? [], settings: settings.data ?? [], articles: articles.data ?? [], now })
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(now)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
