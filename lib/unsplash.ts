/**
 * Photos Unsplash côté navigateur (admin : publication Instagram, carrousels).
 * Aucune clé ici : la recherche passe par /api/cms/unsplash, qui lit la clé enregistrée dans les Connexions du CMS.
 */

export type { UnsplashPhoto } from '@/lib/unsplash-server'
import type { UnsplashPhoto } from '@/lib/unsplash-server'

/** Photos pour une recherche. Lève une erreur lisible si la clé Unsplash n'est pas enregistrée ou si la session a expiré. */
export async function searchUnsplash(query: string, perPage = 10): Promise<UnsplashPhoto[]> {
  const res = await fetch(`/api/cms/unsplash?query=${encodeURIComponent(query)}&per_page=${perPage}`, { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as { results?: UnsplashPhoto[]; configured?: boolean; error?: string }
  if (!res.ok) throw new Error(data.error || 'Recherche impossible.')
  if (data.configured === false) throw new Error(data.error || 'Aucune clé Unsplash enregistrée.')
  return data.results ?? []
}

/** Photo au hasard pour un sujet. */
export async function getRandomPhoto(topic: string): Promise<UnsplashPhoto | null> {
  return (await searchUnsplash(topic, 1))[0] ?? null
}

/** Adresse de l'image pour Instagram (la taille « regular » suffit). */
export function getInstagramUrl(photo: UnsplashPhoto): string {
  return photo.urls.regular
}

/** Crédit du photographe pour la légende. */
export function getCredit(photo: UnsplashPhoto): string {
  return `Photo by ${photo.user.name} @${photo.user.username}`
}
