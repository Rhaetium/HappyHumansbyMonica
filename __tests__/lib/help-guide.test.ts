import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ASK_PROMPTS, CMS_RULE, HELP_RECIPES, WEEKLY_ROUTINE } from '@/lib/help-guide'
import { TAB_GROUPS } from '@/lib/admin-tab-groups'

const src = fs.readFileSync(path.resolve(__dirname, '../../app/cms-admin/page.tsx'), 'utf8')
const start = src.indexOf('const TABS = [')
const tabIds = [...src.slice(start, src.indexOf('];', start)).matchAll(/\{\s*id:\s*'([^']+)',\s*label:/g)].map(m => m[1])

describe('aide intégrée', () => {
  it('l’onglet Aide existe et appartient à un thème', () => {
    expect(tabIds).toContain('aide')
    expect(TAB_GROUPS.flatMap(g => g.tabs)).toContain('aide')
  })
  it('chaque recette et chaque tâche de la routine ouvre un onglet qui existe', () => {
    for (const r of [...HELP_RECIPES, ...WEEKLY_ROUTINE]) expect(tabIds, r.id).toContain(r.tab)
  })
  it('identifiants uniques, étapes non vides', () => {
    for (const list of [HELP_RECIPES, WEEKLY_ROUTINE, ASK_PROMPTS]) expect(new Set(list.map(x => x.id)).size).toBe(list.length)
    for (const r of HELP_RECIPES) { expect(r.steps.length).toBeGreaterThanOrEqual(2); expect(r.steps.every(s => s.length > 10)).toBe(true) }
  })
  it('chaque demande type rappelle que le CMS reste la source de vérité', () => {
    expect(CMS_RULE).toContain('CMS')
    for (const p of ASK_PROMPTS) expect(p.text, p.id).toContain(CMS_RULE)
  })
})
