import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { auditArticles, type ArticleAuditInput } from '@/lib/article-audit'

export const dynamic = 'force-dynamic'

/** GET /api/cms/articles-audit : ce qu'il reste à améliorer dans les articles publiés (administration seulement). */
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ total: 0, results: [] })

  const { data, error } = await createClient(url, key)
    .from('cms_blog_posts')
    .select('id, title, slug, content, seo_description, featured_image, updated_at, published_at')
    .eq('published', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const articles = (data ?? []) as ArticleAuditInput[]
  return NextResponse.json({ total: articles.length, results: auditArticles(articles) })
}
