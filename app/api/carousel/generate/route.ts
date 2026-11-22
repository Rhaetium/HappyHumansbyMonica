import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { generateText, AiError } from '@/lib/ai-text'
import { CAROUSEL_SYSTEM, buildCarouselPrompt, parseCarouselResponse } from '@/lib/content-ai'
import { loadConnectionEnv } from '@/lib/connections'
import { searchUnsplashPhotos } from '@/lib/unsplash-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Carrousel Instagram généré par IA (fournisseur : voir lib/ai-text.ts).
// Les photos Unsplash sont un bonus : sans NEXT_PUBLIC_UNSPLASH_ACCESS_KEY, le texte est quand même généré.
export async function POST(request: NextRequest) {
  // Route d'administration : réservée aux sessions CMS authentifiées
  const authError = requireCmsAuth(request)
  if (authError) return authError

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  if (!topic || topic.length > 300) {
    return NextResponse.json({ success: false, error: 'Sujet requis (300 caractères max).' }, { status: 400 })
  }

  let carousel
  try {
    const { text } = await generateText({ system: CAROUSEL_SYSTEM, prompt: buildCarouselPrompt(topic), maxTokens: 1500 })
    carousel = parseCarouselResponse(text, topic)
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ success: false, error: e.message }, { status: e.status })
    console.error('Carousel generation error', e)
    return NextResponse.json({ success: false, error: 'Réponse de l’IA inexploitable. Réessayez.' }, { status: 502 })
  }

  const images = await searchUnsplash(topic)
  return NextResponse.json({ success: true, topic, ...carousel, images, image: images[0] ?? '' })
}

async function searchUnsplash(query: string): Promise<string[]> {
  const key = (await loadConnectionEnv()).NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  const photos = await searchUnsplashPhotos(key, query, 5)
  return photos.map(p => p.urls?.regular).filter((u): u is string => !!u)
}
