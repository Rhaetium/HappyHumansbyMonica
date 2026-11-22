import { describe, it, expect } from 'vitest'
import { DEFAULT_NAV, type NavItem } from '@/hooks/useCmsNavigation'
import { addNavItem, addSubItem, cloneNav, moveItem, moveSubItem,
  removeNavItem, removeSubItem, renumber, updateNavItem, updateSubItem, addNavLink, moveItemBy, moveSubItemBy, navHasHref, removeNavLinkByHref } from '@/lib/cms-nav'

/** Menu de test, indépendant du menu d'origine du site (dont l'ordre et les libellés peuvent évoluer). */
const MENU: NavItem[] = [
  { id: '1', href: '/a-propos', label: 'Monica', visible: true, position: 1 },
  {
    id: '2', label: 'Coaching', visible: true, position: 2, isDropdown: true,
    dropdownItems: [
      { id: '2a', href: '/coaching', label: 'Coaching individuel', visible: true, position: 1 },
      { id: '2b', href: '/temoignages', label: 'Témoignages', visible: false, position: 2 },
      { id: '2c', href: '/sparring-partner', label: 'Sparring Partner', visible: true, position: 3 },
    ],
  },
  { id: '3', href: '/entreprises', label: 'Organisations', visible: true, position: 3 },
  { id: '4', href: '/happiness-design', label: 'Happiness Design', visible: true, position: 4 },
  { id: '5', href: '/relations', label: 'Relations', visible: true, position: 5 },
  { id: '6', href: '/contact', label: 'Contact', visible: true, position: 6 },
  { id: '7', href: '/booking', label: 'Réserver une séance', visible: true, position: 7, isCta: true },
]
const menu = () => cloneNav(MENU)
const labels = (items: { label: string }[]) => items.map(i => i.label)
const POSITIONS = [1, 2, 3, 4, 5, 6, 7]

describe('menu d’origine du site', () => {
  it('« Monica » est placé après « Relations » et avant « Contact »', () => {
    const hrefs = DEFAULT_NAV.map(i => i.href ?? '(menu déroulant)')
    expect(hrefs).toEqual(['(menu déroulant)', '/entreprises', '/happiness-design', '/relations', '/a-propos', '/contact', '/booking'])
    const idx = (href: string) => DEFAULT_NAV.findIndex(i => i.href === href)
    expect(idx('/a-propos')).toBe(idx('/relations') + 1)
    expect(idx('/contact')).toBe(idx('/a-propos') + 1)
  })

  it('les positions se suivent (1, 2, 3…) et les identifiants sont uniques', () => {
    expect(DEFAULT_NAV.map(i => i.position)).toEqual(POSITIONS)
    expect(new Set(DEFAULT_NAV.map(i => i.id)).size).toBe(DEFAULT_NAV.length)
  })

  it('le bouton de réservation reste en dernier et le menu déroulant garde ses liens', () => {
    expect(DEFAULT_NAV.at(-1)).toMatchObject({ href: '/booking', isCta: true })
    const dropdown = DEFAULT_NAV.find(i => i.isDropdown)!
    expect(dropdown.dropdownItems!.map(s => s.href)).toEqual(['/coaching', '/temoignages', '/sparring-partner'])
  })
})

describe('menu du site — opérations de l’éditeur', () => {
  it('moveItem : glisser vers le bas place l’élément AVANT la cible (comme le trait vert de l’éditeur)', () => {
    const next = moveItem(menu(), 0, 3) // Monica glissé sur « Happiness Design »
    expect(labels(next)).toEqual(['Coaching', 'Organisations', 'Monica', 'Happiness Design', 'Relations', 'Contact', 'Réserver une séance'])
    expect(next.map(i => i.position)).toEqual(POSITIONS)
  })

  it('moveItem : glisser vers le haut, et dépôt en fin de liste', () => {
    expect(labels(moveItem(menu(), 4, 0))[0]).toBe('Relations')
    const end = moveItem(menu(), 0, MENU.length)
    expect(labels(end).at(-1)).toBe('Monica')
    expect(end.map(i => i.position)).toEqual(POSITIONS)
  })

  it('moveItem : « Monica » glissé après « Relations » et avant « Contact »', () => {
    const next = moveItem(menu(), 0, 5) // dépôt sur « Contact » : Monica se place juste avant
    expect(labels(next).slice(3, 6)).toEqual(['Relations', 'Monica', 'Contact'])
  })

  it('moveItem : déplacements sans effet', () => {
    const base = menu()
    expect(moveItem(base, 2, 2)).toBe(base)
    expect(moveItem(base, -1, 2)).toBe(base)
    expect(moveItem(base, 2, 99)).toBe(base)
  })

  it('renommer « Organisations » en « Entreprises » sans toucher aux autres liens', () => {
    const next = updateNavItem(menu(), '3', { label: 'Entreprises' })
    expect(next.find(i => i.id === '3')?.label).toBe('Entreprises')
    expect(next.find(i => i.id === '3')?.href).toBe('/entreprises')
    expect(labels(next).filter(l => l === 'Entreprises')).toHaveLength(1)
  })

  it('sous-menu : réordonner, renommer, ajouter, supprimer', () => {
    let nav = menu()
    nav = moveSubItem(nav, '2', 2, 0)
    expect(labels(nav[1].dropdownItems!)).toEqual(['Sparring Partner', 'Coaching individuel', 'Témoignages'])
    expect(nav[1].dropdownItems!.map(s => s.position)).toEqual([1, 2, 3])
    nav = updateSubItem(nav, '2', '2c', { label: 'Sparring' })
    expect(nav[1].dropdownItems![0].label).toBe('Sparring')
    nav = addSubItem(nav, '2')
    expect(nav[1].dropdownItems).toHaveLength(4)
    nav = removeSubItem(nav, '2', '2b')
    expect(labels(nav[1].dropdownItems!)).toEqual(['Sparring', 'Coaching individuel', 'Nouveau lien'])
  })

  it('ajouter et supprimer un lien du menu', () => {
    let nav = addNavItem(menu())
    expect(nav).toHaveLength(8)
    expect(nav.at(-1)).toMatchObject({ label: 'Nouveau lien', visible: true, position: 8 })
    const addedId = nav.at(-1)!.id
    nav = removeNavItem(nav, addedId)
    expect(nav).toHaveLength(7)
    expect(nav.map(i => i.position)).toEqual(POSITIONS)
  })

  it('les identifiants des liens ajoutés sont uniques', () => {
    const ids = new Set(addNavItem(addNavItem(addNavItem([]))).map(i => i.id))
    expect(ids.size).toBe(3)
  })

  it('cloneNav : modifier la copie ne change pas le menu d’origine', () => {
    const copy = cloneNav(DEFAULT_NAV)
    const dropdown = copy.find(i => i.isDropdown)!
    const original = DEFAULT_NAV.find(i => i.isDropdown)!.dropdownItems![0].label
    dropdown.dropdownItems![0].label = 'X'
    copy[0].label = 'Y'
    expect(DEFAULT_NAV.find(i => i.isDropdown)!.dropdownItems![0].label).toBe(original)
    expect(DEFAULT_NAV[0].label).not.toBe('Y')
  })

  it('renumber ne modifie pas la liste d’origine', () => {
    const src = [{ position: 9 }, { position: 4 }]
    expect(renumber(src)).toEqual([{ position: 1 }, { position: 2 }])
    expect(src[0].position).toBe(9)
  })
})

describe('déplacer sans glisser-déposer (▲ ▼)', () => {
  const it3 = [
    { id: 'a', label: 'A', visible: true, position: 1 },
    { id: 'b', label: 'B', visible: true, position: 2 },
    { id: 'c', label: 'C', visible: true, position: 3 },
  ]
  it('monte et descend d\'une place, en renumérotant', () => {
    expect(moveItemBy(it3, 1, -1).map(i => [i.id, i.position])).toEqual([['b', 1], ['a', 2], ['c', 3]])
    expect(moveItemBy(it3, 1, 1).map(i => [i.id, i.position])).toEqual([['a', 1], ['c', 2], ['b', 3]])
  })
  it('hors limites : liste inchangée', () => {
    expect(moveItemBy(it3, 0, -1)).toBe(it3)
    expect(moveItemBy(it3, 2, 1)).toBe(it3)
    expect(moveItemBy(it3, 9, 1)).toBe(it3)
  })
  it('ne modifie pas la liste d\'origine', () => {
    moveItemBy(it3, 0, 1)
    expect(it3.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('liens du menu vers une page', () => {
  const menu = [
    { id: '1', label: 'Coaching', visible: true, position: 1, isDropdown: true, dropdownItems: [
      { id: '1a', href: '/coaching', label: 'Coaching individuel', visible: true, position: 1 },
    ] },
    { id: '2', href: '/contact', label: 'Contact', visible: true, position: 2 },
    { id: '3', href: '/booking', label: 'Réserver', visible: true, position: 3, isCta: true },
  ]
  it('retrouve une adresse, y compris dans un menu déroulant', () => {
    expect(navHasHref(menu, '/contact')).toBe(true)
    expect(navHasHref(menu, '/coaching')).toBe(true)
    expect(navHasHref(menu, '/p/nouvelle')).toBe(false)
  })
  it('ajoute le lien AVANT le bouton final, qui reste le dernier', () => {
    const out = addNavLink(menu, ' Mes tarifs ', '/p/tarifs')
    expect(out.map(i => i.label)).toEqual(['Coaching', 'Contact', 'Mes tarifs', 'Réserver'])
    expect(out.map(i => i.position)).toEqual([1, 2, 3, 4])
    expect(out[2]).toMatchObject({ href: '/p/tarifs', visible: true })
  })
  it('sans bouton final, ajoute à la fin ; n\'ajoute jamais deux fois la même adresse', () => {
    const noCta = menu.slice(0, 2)
    expect(addNavLink(noCta, 'X', '/p/x').map(i => i.href)).toEqual([undefined, '/contact', '/p/x'])
    expect(addNavLink(menu, 'Contact bis', '/contact')).toBe(menu)
  })
  it('un titre vide donne un libellé par défaut', () => {
    expect(addNavLink([], '   ', '/p/x')[0].label).toBe('Nouvelle page')
  })
  it('retire un lien du menu et des menus déroulants, en renumérotant', () => {
    const out = removeNavLinkByHref(menu, '/coaching')
    expect(out[0].dropdownItems).toEqual([])
    const out2 = removeNavLinkByHref(menu, '/contact')
    expect(out2.map(i => [i.label, i.position])).toEqual([['Coaching', 1], ['Réserver', 2]])
    expect(removeNavLinkByHref(menu, '/absent')).toHaveLength(3)
  })
})

describe('déplacer un lien d\'un menu déroulant (▲ ▼)', () => {
  const menu = [
    { id: 'm', label: 'Menu', visible: true, position: 1, isDropdown: true, dropdownItems: [
      { id: 's1', href: '/a', label: 'A', visible: true, position: 1 },
      { id: 's2', href: '/b', label: 'B', visible: true, position: 2 },
    ] },
    { id: 'x', href: '/x', label: 'X', visible: true, position: 2 },
  ]
  it('déplace dans le bon menu seulement', () => {
    const out = moveSubItemBy(menu, 'm', 0, 1)
    expect(out[0].dropdownItems!.map(s => s.id)).toEqual(['s2', 's1'])
    expect(out[1]).toBe(menu[1])
  })
  it('hors limites ou menu inconnu : rien ne change', () => {
    expect(moveSubItemBy(menu, 'm', 0, -1)[0].dropdownItems!.map(s => s.id)).toEqual(['s1', 's2'])
    expect(moveSubItemBy(menu, 'zzz', 0, 1)[0].dropdownItems!.map(s => s.id)).toEqual(['s1', 's2'])
  })
})
