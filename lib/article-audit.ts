// Contrôle des articles publiés, pour la carte « À améliorer » de l'onglet Visibilité.
// Réutilise la liste de contrôle du gabarit (checkArticle) et ajoute ce qui se juge sur l'ensemble :
// titres en double, image manquante, article ancien. Fonctions pures, testées dans __tests__/lib/article-audit.test.ts.

import { checkArticle } from '@/lib/article-template'

export type ArticleAuditInput = {
  id: string
  title: string
  slug: string
  content: string
  seo_description?: string | null
  featured_image?: string | null
  updated_at?: string | null
  published_at?: string | null
}

export type ArticleIssue = { id: string; label: string; hint: string; weight: number }

export type ArticleAuditResult = {
  id: string
  title: string
  issues: ArticleIssue[]
  /** Somme des poids : sert à classer les articles du plus utile à corriger au moins urgent. */
  score: number
}

/** Un article non retouché depuis ce délai est signalé (les prix et chiffres vieillissent). */
export const STALE_DAYS = 365

// Poids : ce qui change le plus la citation par Google et les assistants IA passe en premier.
const WEIGHTS: Record<string, number> = {
  answer: 5, faq: 4, description: 3, placeholders: 5, number: 2, h2: 2, title: 2, slug: 1,
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

export function auditArticles(articles: ArticleAuditInput[], now: Date = new Date()): ArticleAuditResult[] {
  const titleCount = new Map<string, number>()
  for (const a of articles) {
    const t = norm(a.title)
    if (t) titleCount.set(t, (titleCount.get(t) ?? 0) + 1)
  }

  const results: ArticleAuditResult[] = []
  for (const a of articles) {
    const issues: ArticleIssue[] = checkArticle({
      title: a.title, slug: a.slug, html: a.content, description: a.seo_description ?? '',
    })
      .filter(c => !c.ok)
      .map(c => ({ id: c.id, label: c.label, hint: c.hint, weight: WEIGHTS[c.id] ?? 1 }))

    if (!a.featured_image) {
      issues.push({ id: 'image', label: 'Pas d’image de présentation', hint: 'Ajoutez une image : elle sert à l’aperçu du lien partagé.', weight: 1 })
    }
    if ((titleCount.get(norm(a.title)) ?? 0) > 1) {
      issues.push({ id: 'duplicate', label: 'Même titre qu’un autre article', hint: 'Deux articles au même titre se concurrencent sur Google : reformulez l’un des deux.', weight: 3 })
    }
    const last = Date.parse(a.updated_at || a.published_at || '')
    if (Number.isFinite(last) && now.getTime() - last > STALE_DAYS * 86_400_000) {
      issues.push({ id: 'stale', label: 'Pas retouché depuis plus d’un an', hint: 'Relisez les prix, chiffres et dates, puis enregistrez : la date de mise à jour sera rafraîchie.', weight: 2 })
    }

    if (issues.length) {
      results.push({ id: a.id, title: a.title, issues, score: issues.reduce((n, i) => n + i.weight, 0) })
    }
  }
  return results.sort((x, y) => y.score - x.score || x.title.localeCompare(y.title, 'fr'))
}
