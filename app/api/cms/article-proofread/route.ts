import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText } from '@/lib/ai-text'
import { PROOFREAD_SYSTEM, buildProofreadPrompt, parseCorrections } from '@/lib/proofread'
import { plainText } from '@/lib/article-seo-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/cms/article-proofread { content } → { success, corrections[] }
// Liste des fautes seulement : l'éditeur applique celles que Monica coche. Rien n'est enregistré ici.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { content?: unknown } | null
  const content = typeof body?.content === 'string' ? body.content : ''
  if (plainText(content).length < 40) {
    return NextResponse.json({ success: false, error: 'Écrivez d’abord un peu de texte à relire.' }, { status: 400 })
  }
  if (content.length > 60_000) {
    return NextResponse.json({ success: false, error: 'Article trop long pour être relu d’un coup.' }, { status: 400 })
  }

  try {
    const { text } = await generateText({ system: PROOFREAD_SYSTEM, prompt: buildProofreadPrompt(content), maxTokens: 2000 })
    return NextResponse.json({ success: true, corrections: parseCorrections(text, content) })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Proofread error', e)
    return NextResponse.json({ success: false, error: 'Erreur de relecture. Réessayez.' }, { status: 500 })
  }
}
