import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { loadConnectionEnv } from '@/lib/connections'
import { searchUnsplashPhotos } from '@/lib/unsplash-server'

export const dynamic = 'force-dynamic'

// GET /api/cms/unsplash?query=…&per_page=6 : recherche de photos pour l'admin (Instagram, carrousels).
// Réservé à l'administration ; la clé Unsplash (Connexions) reste côté serveur.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('query') ?? '').trim()
  if (!query || query.length > 100) return NextResponse.json({ error: 'Recherche requise (100 caractères max).' }, { status: 400 })

  const key = (await loadConnectionEnv()).NEXT_PUBLIC_UNSPLASH_ACCESS_KEY?.trim()
  if (!key) {
    return NextResponse.json({ configured: false, results: [], error: 'Aucune clé Unsplash : ajoutez-la dans l’onglet Connexions.' })
  }
  const results = await searchUnsplashPhotos(key, query, Number(searchParams.get('per_page')) || 10)
  return NextResponse.json({ configured: true, results })
}
