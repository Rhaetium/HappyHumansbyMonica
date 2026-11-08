import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { generateText, AiError } from '@/lib/ai-text'
import { BLOG_SYSTEM, blogLength, blogMaxTokens, blogStyle, buildBlogPrompt, parseBlogResponse } from '@/lib/content-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Brouillon d'article généré par IA (fournisseur : voir lib/ai-text.ts). Rien n'est enregistré ici.
export async function POST(req: NextRequest) {
  // Route d'administration : réservée aux sessions CMS authentifiées
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  if (!topic || topic.length > 300) {
    return NextResponse.json({ success: false, error: 'Sujet requis (300 caractères max).' }, { status: 400 })
  }
  const style = blogStyle(body?.style)
  const length = blogLength(body?.length)

  try {
    const { text } = await generateText({
      system: BLOG_SYSTEM,
      prompt: buildBlogPrompt(topic, style, length),
      maxTokens: blogMaxTokens(length),
    })
    const draft = parseBlogResponse(text)
    if (!draft.title || !draft.content) {
      return NextResponse.json({ success: false, error: 'Réponse de l’IA inexploitable. Réessayez.' }, { status: 502 })
    }
    return NextResponse.json({ success: true, ...draft })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Blog generation error', e)
    return NextResponse.json({ success: false, error: 'Erreur de génération. Réessayez.' }, { status: 500 })
  }
}
