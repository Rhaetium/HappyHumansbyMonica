// Programmation des articles : un article « publié » dont la date de publication est dans le futur n'est pas encore en ligne.
// Aucune tâche planifiée : le site compare la date à l'heure courante à chaque lecture (pages régénérées au plus toutes les 60 s).
// Logique pure, testée dans __tests__/lib/article-schedule.test.ts.

export type ArticleLike = { published?: boolean | null; published_at?: string | null }
export type ArticleStatus = 'draft' | 'scheduled' | 'live'

function time(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

/** Brouillon, programmé (publié mais date à venir) ou en ligne. Une date absente ou illisible vaut « maintenant ». */
export function articleStatus(a: ArticleLike, now: Date = new Date()): ArticleStatus {
  if (!a.published) return 'draft'
  const t = time(a.published_at)
  return t !== null && t > now.getTime() ? 'scheduled' : 'live'
}

export function isArticleLive(a: ArticleLike, now: Date = new Date()): boolean {
  return articleStatus(a, now) === 'live'
}

/** Filtre PostgREST « sans date, ou date passée » à ajouter à une requête déjà limitée aux articles publiés. */
export function liveFilter(now: Date = new Date()): string {
  return `published_at.is.null,published_at.lte.${now.toISOString()}`
}

/** ISO → valeur d'un champ <input type="datetime-local"> (heure locale du navigateur, sans secondes). */
export function toDatetimeLocal(iso: string | null | undefined): string {
  const t = time(iso)
  if (t === null) return ''
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Valeur d'un champ datetime-local (heure locale) → ISO UTC ; vide ou illisible → null. */
export function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

/** Date lisible pour « Programmé pour le … » (fuseau du navigateur). */
export function formatSchedule(iso: string | null | undefined): string {
  const t = time(iso)
  if (t === null) return ''
  return new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Articles passés « en ligne » entre `since` (exclu) et `now` (inclus) : ceux dont l'heure programmée vient d'arriver. */
export function justWentLive<T extends ArticleLike>(articles: T[], since: Date, now: Date = new Date()): T[] {
  return articles.filter(a => {
    if (!a.published) return false
    const t = time(a.published_at)
    return t !== null && t > since.getTime() && t <= now.getTime()
  })
}
