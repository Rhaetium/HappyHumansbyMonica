import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText } from '@/lib/ai-text'
import { fetchPublicImage } from '@/lib/fetch-public-image'
import { sniffImage } from '@/lib/image-sniff'
import { SITE_URL } from '@/lib/site-url'
import { ALT_SYSTEM, buildAltPrompt, cleanAlt } from '@/lib/alt-text'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// POST /api/cms/alt-suggest { imageUrl, context? } → { success, alt }
// L'image (publique) est envoyée à Gemini, qui la décrit en une phrase. Rien n'est enregistré : l'éditeur propose la
// description à Monica, qui la corrige avant de valider.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { imageUrl?: unknown; context?: unknown } | null
  const raw = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : ''
  if (!raw) return NextResponse.json({ success: false, error: 'Adresse de l’image manquante.' }, { status: 400 })
  // Une image du site (« /images/x.jpg ») est lue à son adresse publique
  const imageUrl = raw.startsWith('/') && !raw.startsWith('//') ? `${SITE_URL}${raw}` : raw
  const context = typeof body?.context === 'string' ? body.context : ''

  const fetched = await fetchPublicImage(imageUrl, MAX_IMAGE_BYTES)
  if (!fetched.ok) return NextResponse.json({ success: false, error: fetched.error }, { status: 400 })
  const image = sniffImage(fetched.buffer)
  if (!image) return NextResponse.json({ success: false, error: 'Format d’image non pris en charge (JPEG, PNG, WebP ou GIF).' }, { status: 400 })

  try {
    const { text } = await generateText({
      system: ALT_SYSTEM,
      prompt: buildAltPrompt(context),
      maxTokens: 200,
      image: { mimeType: image.contentType, base64: fetched.buffer.toString('base64') },
    })
    const alt = cleanAlt(text)
    if (!alt) return NextResponse.json({ success: false, error: 'Aucune description obtenue. Réessayez.' }, { status: 502 })
    return NextResponse.json({ success: true, alt })
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Alt suggest error', e)
    return NextResponse.json({ success: false, error: 'Erreur de description. Réessayez.' }, { status: 500 })
  }
}
