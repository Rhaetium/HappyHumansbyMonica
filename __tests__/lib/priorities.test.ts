import { describe, it, expect } from 'vitest'
import { buildPriorities, MAX_PRIORITIES } from '@/lib/priorities'
import type { HealthCheck } from '@/lib/cms-health'
import type { SeoIssue } from '@/lib/seo-audit'
import type { ArticleAuditResult } from '@/lib/article-audit'

const health = (id: string, level: HealthCheck['level']): HealthCheck => ({ id, level, title: id, detail: 'd' })
const seo = (page: string, level: SeoIssue['level'], message = 'm'): SeoIssue => ({ page, label: page.toUpperCase(), field: 'seo_title', level, message })
const art = (id: string, score: number): ArticleAuditResult => ({ id, title: `A${id}`, score, issues: [{ id: 'faq', label: 'Pas de FAQ', hint: '', weight: score }] })

describe('buildPriorities', () => {
  it('range : santé en erreur, page en erreur, santé à surveiller, page à corriger, articles', () => {
    const res = buildPriorities({
      health: [health('h-warn', 'warn'), health('h-ok', 'ok'), health('h-err', 'error')],
      seo: [seo('coaching', 'warning'), seo('home', 'error')],
      articles: [art('1', 5)],
    })
    expect(res.map(p => p.id)).toEqual(['health:h-err', 'page:home', 'health:h-warn', 'page:coaching', 'article:1'])
  })

  it('regroupe les défauts d’une même page en une seule priorité et ignore les infos', () => {
    const res = buildPriorities({
      health: [], articles: [],
      seo: [seo('home', 'warning', 'Titre trop long.'), seo('home', 'warning', 'Description courte.'), seo('faq', 'info')],
    })
    expect(res).toHaveLength(1)
    expect(res[0].detail).toBe('Titre trop long. Description courte.')
    expect(res[0].tab).toBe('seo')
  })

  it('classe les articles du plus utile à corriger au moins urgent', () => {
    const res = buildPriorities({ health: [], seo: [], articles: [art('a', 2), art('b', 9)] })
    expect(res.map(p => p.id)).toEqual(['article:b', 'article:a'])
  })

  it('se limite à dix priorités', () => {
    const articles = Array.from({ length: 25 }, (_, i) => art(String(i), i + 1))
    expect(buildPriorities({ health: [], seo: [], articles })).toHaveLength(MAX_PRIORITIES)
  })

  it('renvoie une liste vide quand tout va bien', () => {
    expect(buildPriorities({ health: [health('x', 'ok')], seo: [], articles: [] })).toEqual([])
  })
})
