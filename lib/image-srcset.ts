/**
 * Tailles d'image adaptées à l'écran (attribut `srcset`) pour les photos Unsplash.
 *
 * Unsplash redimensionne à la volée via le paramètre `w` de l'adresse. Une photo de bandeau demandée en 1600 px
 * pèse 150 à 370 Ko : inutile sur un téléphone de 390 px. On propose donc plusieurs largeurs et le navigateur
 * choisit la plus petite qui convient. Les autres sources (Supabase, fichiers du site) sont laissées intactes.
 */

const UNSPLASH_HOST = 'images.unsplash.com'
const STEPS = [480, 768, 1024, 1280, 1600]

/** `srcset` d'une photo Unsplash, ou `undefined` si l'adresse n'est pas une photo Unsplash redimensionnable. */
export function unsplashSrcSet(src: string | undefined): string | undefined {
  if (!src) return undefined
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return undefined
  }
  if (url.hostname !== UNSPLASH_HOST) return undefined
  const original = Number(url.searchParams.get('w'))
  if (!Number.isFinite(original) || original <= 0) return undefined

  const widths = [...STEPS.filter(w => w < original), original]
  if (widths.length < 2) return undefined

  return widths
    .map(w => {
      const u = new URL(url.toString())
      u.searchParams.set('w', String(w))
      return `${u.toString()} ${w}w`
    })
    .join(', ')
}
