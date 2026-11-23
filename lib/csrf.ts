// Défense en profondeur contre les requêtes envoyées depuis un AUTRE site (CSRF) vers l'API du CMS.
// Le cookie de session est déjà « SameSite=Strict » ; ceci ajoute un second verrou, indépendant du navigateur :
// une écriture (POST, PUT, PATCH, DELETE) sur /api/cms/ dont l'en-tête Origin n'est pas ce site est refusée.
// Les navigateurs envoient toujours Origin sur une écriture venue d'un autre site ; son absence (outil en ligne
// de commande, serveur à serveur) n'est pas un risque CSRF, car il n'y a alors pas de cookie du navigateur de Monica.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const stripWww = (host: string) => host.toLowerCase().replace(/^www\./, '')

/** true si la requête doit être refusée. */
export function isCrossSiteWrite(opts: { method: string; pathname: string; origin: string | null; host: string | null }): boolean {
  if (SAFE_METHODS.has(opts.method.toUpperCase())) return false
  if (!opts.pathname.startsWith('/api/cms/') && opts.pathname !== '/api/cms') return false
  if (!opts.origin) return false
  if (!opts.host) return true
  try {
    return stripWww(new URL(opts.origin).host) !== stripWww(opts.host)
  } catch {
    return true // Origin illisible (ex. « null ») : refusé
  }
}
