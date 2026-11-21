import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { TAB_GROUPS, groupCount, groupForTab, tabsOfGroup } from '@/lib/admin-tab-groups'

const root = path.resolve(__dirname, '../..')

/** Identifiants d'onglets réellement déclarés dans app/cms-admin/page.tsx (const TABS = [ { id: '…', label: '…' }, … ]). */
function declaredTabIds(): string[] {
  const src = fs.readFileSync(path.join(root, 'app/cms-admin/page.tsx'), 'utf8')
  const start = src.indexOf('const TABS = [')
  const end = src.indexOf('];', start)
  return [...src.slice(start, end).matchAll(/\{\s*id:\s*'([^']+)',\s*label:/g)].map(m => m[1])
}

describe('thèmes des onglets de l\'admin', () => {
  const ids = declaredTabIds()

  it('lit bien les onglets déclarés', () => {
    expect(ids.length).toBeGreaterThan(12)
    expect(ids).toContain('visibilite')
  })

  it('chaque onglet déclaré appartient à un thème (sinon il serait introuvable dans l\'admin)', () => {
    const grouped = new Set(TAB_GROUPS.flatMap(g => g.tabs))
    expect(ids.filter(id => !grouped.has(id)), 'onglets sans thème : à ajouter dans lib/admin-tab-groups.ts').toEqual([])
  })

  it('un onglet n\'est dans qu\'un seul thème, et chaque thème ne cite que des onglets qui existent', () => {
    const all = TAB_GROUPS.flatMap(g => g.tabs)
    expect(new Set(all).size).toBe(all.length)
    expect(all.filter(id => !ids.includes(id)), 'thèmes qui citent un onglet inexistant').toEqual([])
  })

  it('les thèmes ont un identifiant et un libellé uniques', () => {
    expect(new Set(TAB_GROUPS.map(g => g.id)).size).toBe(TAB_GROUPS.length)
    expect(new Set(TAB_GROUPS.map(g => g.label)).size).toBe(TAB_GROUPS.length)
  })
})

describe('groupForTab / tabsOfGroup / groupCount', () => {
  const tabs = [
    { id: 'articles', label: 'A', count: 3 },
    { id: 'pages', label: 'P', count: null },
    { id: 'messages', label: 'M', count: 2 },
    { id: 'booking', label: 'B', count: 1 },
    { id: 'seo', label: 'S', count: 4 },
  ]
  it('trouve le thème d\'un onglet, retombe sur le premier thème pour un onglet inconnu', () => {
    expect(groupForTab('messages').id).toBe('echanges')
    expect(groupForTab('seo').id).toBe('visibilite')
    expect(groupForTab('inconnu')).toBe(TAB_GROUPS[0])
  })
  it('garde l\'ordre du thème et ignore les onglets absents', () => {
    expect(tabsOfGroup(groupForTab('pages'), tabs).map(t => t.id)).toEqual(['articles', 'pages'])
    expect(tabsOfGroup(groupForTab('booking'), tabs).map(t => t.id)).toEqual(['booking', 'messages'])
  })
  it('additionne les pastilles du thème (null = 0)', () => {
    expect(groupCount(groupForTab('booking'), tabs)).toBe(3)
    expect(groupCount(groupForTab('pages'), tabs)).toBe(3)
    expect(groupCount(groupForTab('seo'), tabs)).toBe(4)
  })
})
