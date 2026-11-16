/**
 * IndexNow : prévient Bing, Yandex, Seznam et Naver (pas Google) qu'une page vient d'être publiée,
 * modifiée ou supprimée, au lieu d'attendre leur prochain passage. Protocole : https://www.indexnow.org
 *
 * La clé est PUBLIQUE par conception : elle est hébergée dans public/<clé>.txt pour prouver que le site
 * est bien à nous. Ce n'est pas un secret. Variable facultative pour la changer : INDEXNOW_KEY
 * (le fichier public/<clé>.txt correspondant doit alors exister).
 *
 * Ne lève jamais d'erreur et ne fait rien hors production : un échec ne doit pas bloquer une publication.
 */
import { after } from 'next/server'
import { SITE_URL } from '@/lib/site-url'

const DEFAULT_KEY = '75fe2bff15434d86986a740d15255f65'
const ENDPOINT = 'https://api.indexnow.org/IndexNow'

/** Transforme des chemins (« /blog/mon-article ») en adresses complètes, sans doublon. */
export function toAbsoluteUrls(paths: string[], base = SITE_URL): string[] {
  const urls = paths
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (/^https?:\/\//i.test(p) ? p : `${base}${p.startsWith('/') ? '' : '/'}${p === '/' ? '' : p}`))
  return [...new Set(urls)]
}

/**
 * À appeler depuis une route d'API : l'envoi se fait APRÈS la réponse (sans ralentir l'enregistrement).
 * Hors requête (tests, scripts), `after` refuse de s'exécuter : on ignore alors simplement l'envoi.
 */
export function scheduleIndexNow(paths: string[]): void {
  try {
    after(() => submitToIndexNow(paths))
  } catch {
    /* hors requête : pas d'envoi */
  }
}

export async function submitToIndexNow(paths: string[]): Promise<void> {
  try {
    const host = new URL(SITE_URL).hostname
    // Seulement sur le vrai site : jamais depuis un poste de développement ni une prévisualisation
    if (process.env.VERCEL_ENV !== 'production' || host === 'localhost' || host.endsWith('.vercel.app')) return

    const key = process.env.INDEXNOW_KEY?.trim() || DEFAULT_KEY
    const urlList = toAbsoluteUrls(paths)
    if (urlList.length === 0) return

    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* IndexNow indisponible : sans incidence sur la publication */
  }
}
