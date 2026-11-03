/**
 * Google Search Console — connexion simple, sans OAuth.
 *
 * Le but est que Monica n'ait **rien à comprendre** : elle copie ce que Google lui donne
 * (une balise `<meta>` entière, un nom de fichier HTML, ou juste un code) dans un seul champ
 * du CMS, et le site s'occupe du reste. Aucune clé d'API, aucun compte de service : la seule
 * chose que Google demande pour vérifier un site, c'est de retrouver un jeton dans la page.
 *
 * Logique pure et testée (`__tests__/lib/search-console.test.ts`) : la route ne fait que
 * récupérer les pages, le verdict se décide ici.
 */

import type { HealthCheck } from './cms-health'

/** Page que Google compare : la balise doit être présente sur l'accueil. */
export const SEARCH_CONSOLE_PROPERTY_DEFAULT = 'https://happyhumans.vercel.app/'

/**
 * Extrait le jeton de vérification de tout ce que Google peut demander de copier.
 *
 * Cas acceptés, dans l'ordre :
 *  - la balise complète : `<meta name="google-site-verification" content="abc123" />` ;
 *  - l'attribut seul : `content="abc123"` ;
 *  - le nom du fichier HTML : `googleabc123.html` ou son URL ;
 *  - le jeton nu : `abc123`.
 *
 * Renvoie `''` si rien d'exploitable (le site n'est alors simplement pas vérifié).
 */
export function extractVerificationToken(input: string | null | undefined): string {
  const raw = (input ?? '').trim()
  if (!raw) return ''

  // 1. Attribut content="…" — couvre la balise complète comme l'attribut isolé.
  const content = raw.match(/content\s*=\s*["']([^"']+)["']/i)
  if (content) return content[1].trim()

  // 2. Méthode « fichier HTML » : google<jeton>.html (nom seul ou URL complète).
  const file = raw.match(/google([A-Za-z0-9_-]+)\.html/i)
  if (file) return file[1]

  // 3. Jeton nu : on retire seulement les guillemets qui l'entourent.
  return raw.replace(/^["']+|["']+$/g, '').trim()
}

/** URL publique du plan du site, telle que Google doit la lire. */
export function sitemapUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/sitemap.xml`
}

/**
 * État de la connexion à Search Console, en clair.
 *
 * On ne peut pas confirmer que Google a *validé* la propriété (cela demanderait l'API
 * Search Console et un compte de service) : on vérifie ce qui est de notre ressort — le jeton
 * est en place, et les fichiers que Google va lire répondent.
 */
export function searchConsoleChecks(input: {
  token: string
  sitemapOk: boolean
  robotsOk: boolean
  robotsHasSitemap: boolean
  sitemapUrl: string
}): HealthCheck[] {
  const { token, sitemapOk, robotsOk, robotsHasSitemap, sitemapUrl: url } = input
  const checks: HealthCheck[] = []

  checks.push(
    token
      ? {
          id: 'gsc-token',
          level: 'ok',
          title: 'Vérification Google en place',
          detail:
            'La balise de vérification est présente sur la page d’accueil. Google peut confirmer ' +
            'que le site vous appartient.',
        }
      : {
          id: 'gsc-token',
          level: 'warn',
          title: 'Site non vérifié dans Google Search Console',
          detail:
            'Sans balise de vérification, Google ne peut pas rattacher le site à votre compte : ' +
            'vous ne verrez ni les recherches, ni les pages indexées.',
          fix:
            'Dans Search Console, ajoutez la propriété puis copiez la balise <meta> proposée ' +
            'dans ⚙️ Paramètres → 🔎 Search Console.',
        },
  )

  checks.push(
    sitemapOk
      ? {
          id: 'gsc-sitemap',
          level: 'ok',
          title: 'Plan du site accessible',
          detail: `Google peut lire la liste des pages à explorer : ${url}`,
        }
      : {
          id: 'gsc-sitemap',
          level: 'error',
          title: 'Plan du site inaccessible',
          detail:
            `L’adresse ${url} ne répond pas. Google ne découvrira pas les pages récentes ` +
            '(articles, pages libres) tout seul.',
          fix:
            'Vérifiez que le site est bien déployé, puis soumettez de nouveau le plan du site ' +
            'dans Search Console.',
        },
  )

  checks.push(
    robotsOk && robotsHasSitemap
      ? {
          id: 'gsc-robots',
          level: 'ok',
          title: 'Consignes pour les robots correctes',
          detail: 'Le fichier robots.txt est lisible et indique le plan du site à Google.',
        }
      : {
          id: 'gsc-robots',
          level: 'warn',
          title: 'Consignes pour les robots à vérifier',
          detail: robotsOk
            ? 'Le fichier robots.txt répond, mais n’indique pas le plan du site à Google.'
            : 'Le fichier robots.txt ne répond pas : Google peut explorer le site au hasard.',
          fix: 'Ce fichier est généré par le site ; si le problème dure, signalez-le.',
        },
  )

  return checks
}
