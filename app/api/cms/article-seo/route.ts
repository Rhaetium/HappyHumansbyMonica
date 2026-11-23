import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText } from '@/lib/ai-text'
import { ARTICLE_SEO_SYSTEM, buildArticleSeoPrompt, parseArticleSeoResponse, plainText } from '@/lib/article-seo-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/cms/article-seo { title, content, category? } → { success, seo_title, seo_description, excerpt }
// Propose seulement : l'éditeur place les textes dans les champs, Monica relit et enregistre.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { title?: unknown; content?: unknown; category?: unknown } | null
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const content = typeof body?.content === 'string' ? body.content : ''
  const category = typeof body?.category === 'string' ? body.category.trim().slice(0, 80) : ''
  if (!title || title.length > 300) {
    return NextResponse.json({ success: false, error: 'Donnez d’abord un titre à l’article.' }, { status: 400 })
  }
  if (plainText(content).length < 80) {
    return NextResponse.json({ success: false, error: 'Écrivez d’abord un peu de texte (quelques phrases) : l’IA s’appuie dessus.' }, { status: 400 })
  }

  try {
    const { text } = await generateText({ system: ARTICLE_SEO_SYSTEM, prompt: buildArticleSeoPrompt(title, content, category), maxTokens: 600 })
    const suggestion = parseArticleSeoResponse(text)
    if (!suggestion) return NextResponse.json({ success: false, error: 'Réponse de l’IA inexploitable. Réessayez.' }, { status: 502 })
    return NextResponse.json({ success: true, ...suggestion })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Article SEO error', e)
    return NextResponse.json({ success: false, error: 'Erreur de l’assistant. Réessayez.' }, { status: 500 })
  }
}
