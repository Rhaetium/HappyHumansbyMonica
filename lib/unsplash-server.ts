// Recherche de photos Unsplash, côté serveur uniquement : la clé vient des Connexions du CMS (ou de Vercel) et ne part
// jamais dans le navigateur. Utilisé par /api/cms/unsplash (recherche de l'admin) et par la génération de carrousels.
// Testé dans __tests__/lib/unsplash-server.test.ts.

export type UnsplashPhoto = {
  id: string
  urls: { raw: string; full: string; regular: string; small: string; thumb: string }
  alt_description: string | null
  description: string | null
  user: { name: string; username: string }
  likes: number
}

const API = 'https://api.unsplash.com'

/** Photos correspondant à la recherche, ou [] si la clé est absente, refusée ou si Unsplash ne répond pas. */
export async function searchUnsplashPhotos(
  key: string | undefined,
  query: string,
  perPage = 10,
  fetcher: typeof fetch = fetch,
): Promise<UnsplashPhoto[]> {
  const k = key?.trim()
  const q = query.trim()
  if (!k || !q) return []
  const n = Math.min(Math.max(Math.trunc(perPage) || 10, 1), 12)
  try {
    const res = await fetcher(`${API}/search/photos?query=${encodeURIComponent(q)}&per_page=${n}&orientation=portrait`, {
      headers: { Authorization: `Client-ID ${k}` },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: UnsplashPhoto[] }
    return Array.isArray(data.results) ? data.results : []
  } catch (e) {
    console.error('Unsplash error', e instanceof Error ? e.message : e)
    return []
  }
}
