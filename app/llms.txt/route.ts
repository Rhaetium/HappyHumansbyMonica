import { NextResponse } from 'next/server'
import { getKvSettings, isPageIndexable } from '@/lib/cms-settings-server'
import { getPageContent } from '@/lib/cms-content-server'
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults'
import { FAQ_DEFAULTS, FAQ_ITEMS } from '@/lib/cms-defaults/faq'
import { readList } from '@/lib/cms-lists'
import { getAllPosts } from '@/lib/blog-supabase'
import { getCustomPages } from '@/lib/custom-pages-server'
import { pageHref } from '@/lib/custom-pages'
import { pagePath } from '@/lib/page-seo'
import { SITE_URL } from '@/lib/site-url'
import { DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION } from '@/lib/site-seo'
import { buildLlmsTxt, type LlmsLink } from '@/lib/llms-txt'
import type { FaqItem } from '@/lib/json-ld'

/**
 * GET /llms.txt — résumé du site pour les moteurs de réponse IA (https://llmstxt.org).
 * Alimenté par le CMS : titres et descriptions de chaque page, articles publiés, questions de la FAQ.
 * Une page masquée à Google (Paramètres → Visibilité pages) est aussi absente d'ici, comme du sitemap.
 */
export const revalidate = 3600

// Pages publiques à présenter (les pages légales n'apportent rien à une IA).
const PAGES = [
  'home', 'a-propos', 'coaching', 'entreprises', 'happiness-design',
  'sparring-partner', 'relations', 'blog', 'faq', 'booking', 'contact',
]

export async function GET() {
  const kv = await getKvSettings()
  const siteName = kv.site_name || 'Happy Humans'

  const pages: LlmsLink[] = []
  for (const page of PAGES.filter(p => isPageIndexable(kv, p))) {
    const url = `${SITE_URL}${pagePath(page) === '/' ? '' : pagePath(page)}`
    if (page === 'home') {
      pages.push({ title: kv.seo_title || DEFAULT_SITE_TITLE, url: `${SITE_URL}/`, description: kv.seo_description || DEFAULT_SITE_DESCRIPTION })
      continue
    }
    const defaults = PAGE_DEFAULTS[page]
    if (!defaults) continue
    const content = await getPageContent(page, defaults)
    if (content.seo_title) pages.push({ title: content.seo_title, url, description: content.seo_description })
  }

  // Pages libres créées dans le CMS
  try {
    for (const p of await getCustomPages()) {
      if (p.published) pages.push({ title: p.title, url: `${SITE_URL}${pageHref(p.slug)}` })
    }
  } catch { /* pages libres indisponibles : on les omet */ }

  const posts: LlmsLink[] = []
  if (isPageIndexable(kv, 'blog')) {
    try {
      for (const post of await getAllPosts()) {
        posts.push({ title: post.title, url: `${SITE_URL}/blog/${post.slug}`, description: post.excerpt ?? post.seo_description ?? undefined })
      }
    } catch { /* blog indisponible : on l'omet */ }
  }

  let faq: FaqItem[] = []
  if (isPageIndexable(kv, 'faq')) {
    const content = await getPageContent('faq', FAQ_DEFAULTS)
    faq = readList(content, 'faq_questions', FAQ_ITEMS)
  }

  const text = buildLlmsTxt({
    siteName,
    summary: kv.seo_description || DEFAULT_SITE_DESCRIPTION,
    pages,
    posts,
    faq,
  })

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
