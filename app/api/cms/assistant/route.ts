import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText } from '@/lib/ai-text'
import { PAGES_CONFIG } from '@/components/cms/admin/config'
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults'
import { buildContentIndex } from '@/lib/cms-search'
import {
  ASSISTANT_SYSTEM,
  MAX_REQUEST_CHARS,
  buildAssistantPrompt,
  maxTokensFor,
  parseAssistantResponse,
  selectRelevantFields,
} from '@/lib/assistant'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/cms/assistant { request } → { success, reply, changes[] }
// Propose des textes ; n'écrit RIEN (l'admin enregistre ensuite les propositions acceptées en brouillon).
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { request?: unknown } | null
  const request = typeof body?.request === 'string' ? body.request.trim() : ''
  if (!request || request.length > MAX_REQUEST_CHARS) {
    return NextResponse.json({ success: false, error: `Décrivez ce que vous voulez changer (${MAX_REQUEST_CHARS} caractères au plus).` }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ success: false, error: 'Supabase non configuré' }, { status: 503 })

  const { data, error } = await createClient(url, key).from('site_content').select('page, block_key, value')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const defs = Object.entries(PAGES_CONFIG).flatMap(([page, cfg]) =>
    cfg.sections.map(section => ({ page, pageLabel: cfg.label, emoji: cfg.emoji, key: section.key, label: section.label, type: section.type })),
  )
  const index = buildContentIndex(defs, data ?? [], PAGE_DEFAULTS)
  const fields = selectRelevantFields(index, request)
  if (fields.length === 0) {
    return NextResponse.json({ success: true, reply: 'Je n’ai trouvé aucun texte à modifier. Précisez la page concernée (ex. « la page Coaching »).', changes: [] })
  }

  try {
    const { text } = await generateText({
      system: ASSISTANT_SYSTEM,
      prompt: buildAssistantPrompt(request, fields),
      maxTokens: maxTokensFor(fields),
    })
    const result = parseAssistantResponse(text, fields)
    if (result.changes.length === 0 && !result.reply) {
      return NextResponse.json({ success: false, error: 'Réponse de l’IA inexploitable. Reformulez ou réessayez.' }, { status: 502 })
    }
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Assistant error', e)
    return NextResponse.json({ success: false, error: 'Erreur de l’assistant. Réessayez.' }, { status: 500 })
  }
}
