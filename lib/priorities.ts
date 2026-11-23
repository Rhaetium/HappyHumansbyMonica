// « Vos priorités » : une seule liste, classée, de ce que Monica doit corriger sur le site,
// qui réunit les alertes de santé (Google, IA, configuration), les titres et descriptions des pages
// et les articles à améliorer. Fonction pure, testée dans __tests__/lib/priorities.test.ts.

import type { HealthCheck } from '@/lib/cms-health'
import type { SeoIssue } from '@/lib/seo-audit'
import type { ArticleAuditResult } from '@/lib/article-audit'
import type { BrokenLink } from '@/lib/link-audit'

export type Priority = {
  id: string
  kind: 'health' | 'page' | 'article' | 'links'
  level: 'error' | 'warn'
  title: string
  /** Ce qui ne va pas, en une phrase. */
  detail: string
  /** Ce qu'il faut faire, si on le sait. */
  fix?: string
  /** Onglet de l'admin où corriger (absent : la correction se fait ailleurs, voir `fix`). */
  tab?: 'seo' | 'articles' | 'pages' | 'custom-pages'
  /** Rang de tri : plus grand = plus urgent. */
  rank: number
}

export const MAX_PRIORITIES = 10

export function buildPriorities(input: {
  health: HealthCheck[]
  seo: SeoIssue[]
  articles: ArticleAuditResult[]
  /** Liens internes cassés (lib/link-audit.ts). Facultatif. */
  links?: BrokenLink[]
}): Priority[] {
  const out: Priority[] = []

  // Un lien cassé = une erreur 404 pour le visiteur : on le range tout en haut. Une priorité par endroit.
  const byPlace = new Map<string, BrokenLink[]>()
  for (const l of input.links ?? []) byPlace.set(l.where, [...(byPlace.get(l.where) ?? []), l])
  for (const [where, links] of byPlace) {
    out.push({
      id: `links:${where}`, kind: 'links', level: 'error',
      title: `${links.length > 1 ? 'Liens cassés' : 'Lien cassé'} : ${where}`,
      detail: `Mène à une page qui n’existe pas : ${links.slice(0, 3).map(l => l.href).join(', ')}${links.length > 3 ? '…' : ''}`,
      tab: links[0].tab, rank: 950,
    })
  }

  for (const c of input.health) {
    if (c.level === 'ok') continue
    out.push({
      id: `health:${c.id}`, kind: 'health', level: c.level === 'error' ? 'error' : 'warn',
      title: c.title, detail: c.detail, fix: c.fix, rank: c.level === 'error' ? 1000 : 700,
    })
  }

  // Une priorité par page (pas une par défaut relevé) : sinon dix lignes sur la même page.
  const byPage = new Map<string, SeoIssue[]>()
  for (const i of input.seo) {
    if (i.level === 'info') continue
    byPage.set(i.page, [...(byPage.get(i.page) ?? []), i])
  }
  for (const [page, issues] of byPage) {
    const hasError = issues.some(i => i.level === 'error')
    out.push({
      id: `page:${page}`, kind: 'page', level: hasError ? 'error' : 'warn',
      title: `Page « ${issues[0].label} » : référencement`,
      detail: issues.map(i => i.message).join(' '),
      tab: 'seo', rank: hasError ? 900 : 500,
    })
  }

  for (const a of input.articles) {
    out.push({
      id: `article:${a.id}`, kind: 'article', level: 'warn',
      title: `Article « ${a.title} »`,
      detail: a.issues.map(i => i.label).join(' · '),
      tab: 'articles', rank: 100 + a.score,
    })
  }

  return out.sort((x, y) => y.rank - x.rank || x.title.localeCompare(y.title, 'fr')).slice(0, MAX_PRIORITIES)
}
