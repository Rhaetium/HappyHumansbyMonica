import { describe, it, expect } from 'vitest'
import { buildCommands, isPaletteShortcut, normalize, searchCommands } from '@/lib/command-palette'

const cmds = buildCommands({
  tabs: [{ id: 'seo', label: '🩺 Référencement' }, { id: 'media', label: '🖼️ Médiathèque' }, { id: 'settings', label: '⚙️ Paramètres' }],
  pages: [{ id: 'coaching', label: '🧭 Coaching' }, { id: 'faq', label: '❓ FAQ' }],
  articles: [{ id: 7, title: 'Combien coûte une séance de coaching ?', published: true }, { id: 8, title: '', published: false }],
  fields: [
    { page: 'coaching', pageLabel: 'Coaching', key: 'hero_title', label: 'Hero — Titre', effectiveValue: 'Retrouver de l’énergie à votre rythme' },
    { page: 'faq', pageLabel: 'FAQ', key: 'q1', label: 'Question 1', effectiveValue: '<p>Le <b>tarif</b> d’une séance est de 120 €.</p>' },
  ],
}, { canSave: true })

describe('normalize', () => {
  it('enlève accents, emoji, ponctuation et casse', () => {
    expect(normalize('  Référencement ✨ ! ')).toBe('referencement')
    expect(normalize('Œuvre   d’art')).toBe('oeuvre d art')
    expect(normalize('Cœur')).toBe('coeur')
  })
})

describe('buildCommands', () => {
  it('une commande par entrée, ids uniques, emoji retiré des onglets', () => {
    const ids = cmds.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(cmds.find(c => c.id === 't:seo')!.label).toBe('Référencement')
  })
  it('« Enregistrer » seulement quand il y a quelque chose à enregistrer', () => {
    expect(cmds.some(c => c.action.type === 'save')).toBe(true)
    expect(buildCommands({ tabs: [], pages: [], articles: [], fields: [] }).some(c => c.action.type === 'save')).toBe(false)
  })
  it('article sans titre nommé, brouillon signalé', () => {
    const a = cmds.find(c => c.id === 'r:8')!
    expect(a.label).toBe('(sans titre)')
    expect(a.hint).toContain('brouillon')
  })
})

describe('searchCommands', () => {
  it('saisie vide : actions et onglets', () => {
    const r = searchCommands(cmds, '')
    expect(r.every(c => c.group === 'Actions' || c.group === 'Aller à')).toBe(true)
    expect(r[0].action.type).toBe('newArticle')
  })
  it('insensible aux accents et à la casse', () => {
    expect(searchCommands(cmds, 'referencement')[0].id).toBe('t:seo')
    expect(searchCommands(cmds, 'MEDIATHEQUE')[0].id).toBe('t:media')
  })
  it('tous les mots doivent être trouvés', () => {
    expect(searchCommands(cmds, 'combien seance').map(c => c.id)).toContain('r:7')
    expect(searchCommands(cmds, 'combien zzz')).toEqual([])
  })
  it('trouve un texte du site par son contenu (balises ignorées)', () => {
    const r = searchCommands(cmds, 'tarif 120')
    expect(r[0].id).toBe('f:faq:q1')
  })
  it('le libellé passe avant le contenu', () => {
    const r = searchCommands(cmds, 'coaching')
    expect(r[0].group).toBe('Pages')
  })
  it('respecte la limite', () => {
    expect(searchCommands(cmds, 'a', 2).length).toBeLessThanOrEqual(2)
  })
  it('caractères spéciaux sans erreur', () => {
    expect(() => searchCommands(cmds, '(.*[')).not.toThrow()
  })
})

describe('isPaletteShortcut', () => {
  it('Ctrl+K et Cmd+K, pas K seul ni Alt', () => {
    expect(isPaletteShortcut({ key: 'k', ctrlKey: true, metaKey: false })).toBe(true)
    expect(isPaletteShortcut({ key: 'K', ctrlKey: false, metaKey: true })).toBe(true)
    expect(isPaletteShortcut({ key: 'k', ctrlKey: false, metaKey: false })).toBe(false)
    expect(isPaletteShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: true })).toBe(false)
  })
})
