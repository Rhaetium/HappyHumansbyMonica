import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText } from '@/lib/ai-text'
import { MAX_DESCRIPTION_CHARS, PAGE_BUILDER_SYSTEM, buildPageBuilderPrompt, parsePageProposal } from '@/lib/page-builder'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/cms/page-builder { description } → { success, page, notes }
// Propose seulement : rien n'est enregistré ici. L'admin crée la page (hors ligne) si Monica accepte.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { description?: unknown } | null
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  if (description.length < 15 || description.length > MAX_DESCRIPTION_CHARS) {
    return NextResponse.json({ success: false, error: `Décrivez la page en une ou deux phrases (jusqu'à ${MAX_DESCRIPTION_CHARS} caractères).` }, { status: 400 })
  }

  try {
    const { text } = await generateText({ system: PAGE_BUILDER_SYSTEM, prompt: buildPageBuilderPrompt(description), maxTokens: 4000 })
    const proposal = parsePageProposal(text)
    if (!proposal) return NextResponse.json({ success: false, error: 'Réponse de l’IA inexploitable. Reformulez ou réessayez.' }, { status: 502 })
    return NextResponse.json({ success: true, ...proposal })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Page builder error', e)
    return NextResponse.json({ success: false, error: 'Erreur de l’assistant. Réessayez.' }, { status: 500 })
  }
}
