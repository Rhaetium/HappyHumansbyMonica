import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { SITE_URL } from '@/lib/site-url'
import { auditLinks, buildKnownPaths, type LinkSource } from '@/lib/link-audit'
import { CUSTOM_PAGES_KEY, CUSTOM_PAGES_PAGE, pageHref, parsePages } from '@/lib/custom-pages'
import { REDIRECTS_KEY, REDIRECTS_PAGE, parseRedirects } from '@/lib/redirects'
import { PAGES_CONFIG } from '@/components/cms/admin/config'
import { isDraftPage } from '@/lib/cms-drafts'

export const dynamic = 'force-dynamic'

/** GET /api/cms/links-audit : liens internes cassés dans les pages publiées, les pages libres et les articles. */
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ total: 0, broken: [] })
  const sb = createClient(url, key)

  const [content, posts] = await Promise.all([
    sb.from('site_content').select('page, block_key, value'),
    sb.from('cms_blog_posts').select('title, slug, content, published').eq('published', true),
  ])
  if (content.error) return NextResponse.json({ error: content.error.message }, { status: 500 })
  if (posts.error) return NextResponse.json({ error: posts.error.message }, { status: 500 })

  const rows = (content.data ?? []).filter(r => !isDraftPage(r.page) && typeof r.value === 'string' && r.value)
  const valueOf = (page: string, k: string) => rows.find(r => r.page === page && r.block_key === k)?.value as string | undefined
  const customPages = parsePages(valueOf(CUSTOM_PAGES_PAGE, CUSTOM_PAGES_KEY))
  const redirects = parseRedirects(valueOf(REDIRECTS_PAGE, REDIRECTS_KEY))

  const known = buildKnownPaths({
    articleSlugs: (posts.data ?? []).map(p => p.slug).filter(Boolean),
    customPagePaths: customPages.filter(p => p.published).map(p => pageHref(p.slug)),
    redirectFrom: redirects.map(r => r.from),
  })

  const sources: LinkSource[] = []
  for (const r of rows) {
    if (r.page === CUSTOM_PAGES_PAGE || r.page === REDIRECTS_PAGE) continue
    const cfg = PAGES_CONFIG[r.page]
    if (!cfg) continue
    const section = cfg.sections.find(s => s.key === r.block_key)
    const where = `Page ${cfg.label} — ${section?.label ?? r.block_key}`
    if (r.block_key.endsWith('_href')) sources.push({ where, tab: 'pages', value: String(r.value), isHref: true })
    else if (String(r.value).includes('href')) sources.push({ where, tab: 'pages', value: String(r.value) })
  }
  for (const p of customPages.filter(p => p.published)) {
    sources.push({ where: `Page libre « ${p.title} »`, tab: 'custom-pages', value: JSON.stringify(p) })
  }
  for (const a of posts.data ?? []) {
    if (a.content) sources.push({ where: `Article « ${a.title} »`, tab: 'articles', value: a.content })
  }

  const broken = auditLinks(sources, known, SITE_URL)
  return NextResponse.json({ total: broken.length, broken })
}
