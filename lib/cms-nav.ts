import type { NavItem } from '@/hooks/useCmsNavigation'

/**
 * Opérations pures sur le menu du site (déplacer, renommer, ajouter, supprimer) — utilisées par l'éditeur de menu
 * (admin et mode édition du site) et testées dans __tests__/lib/cms-nav.test.ts.
 */

/** Clés de `site_content` (page « navigation ») : les liens du menu et le verrou d'ordre. */
export const NAV_KEY = 'nav_items'
export const NAV_LOCKED_KEY = 'nav_locked'

/**
 * Verrou d'ordre : « 1 » = l'ordre du menu ne peut plus être modifié par glisser-déposer
 * (renommer, masquer, ajouter ou supprimer restent possibles). Une valeur absente ou illisible
 * laisse le menu libre.
 */
export function isNavLocked(value: string | null | undefined): boolean {
  return (value ?? '').trim() === '1'
}

/** Renumérote les positions (1, 2, 3…) dans l'ordre actuel de la liste. */
export function renumber<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, position: i + 1 }))
}

/** Déplace l'élément `from` à la place `to` (glisser-déposer). */
export function moveItem<T extends { position: number }>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to > items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to > from ? to - 1 : to, 0, moved)
  return renumber(next)
}

/** Déplace un sous-élément d'un menu déroulant. */
export function moveSubItem(items: NavItem[], parentId: string, from: number, to: number): NavItem[] {
  return items.map(item =>
    item.id === parentId ? { ...item, dropdownItems: moveItem(item.dropdownItems ?? [], from, to) } : item,
  )
}

export function updateNavItem(items: NavItem[], id: string, updates: Partial<NavItem>): NavItem[] {
  return items.map(item => (item.id === id ? { ...item, ...updates } : item))
}

export function updateSubItem(items: NavItem[], parentId: string, subId: string, updates: Partial<NavItem>): NavItem[] {
  return items.map(item =>
    item.id === parentId
      ? { ...item, dropdownItems: (item.dropdownItems ?? []).map(sub => (sub.id === subId ? { ...sub, ...updates } : sub)) }
      : item,
  )
}

let counter = 0
const newId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`

/** Ajoute un lien en fin de menu. */
export function addNavItem(items: NavItem[]): NavItem[] {
  return renumber([...items, { id: newId(), label: 'Nouveau lien', href: '/', visible: true, position: items.length + 1 }])
}

/** Ajoute un lien dans un menu déroulant. */
export function addSubItem(items: NavItem[], parentId: string): NavItem[] {
  return items.map(item =>
    item.id === parentId
      ? {
          ...item,
          dropdownItems: renumber([
            ...(item.dropdownItems ?? []),
            { id: newId(), label: 'Nouveau lien', href: '/', visible: true, position: (item.dropdownItems?.length ?? 0) + 1 },
          ]),
        }
      : item,
  )
}

export function removeNavItem(items: NavItem[], id: string): NavItem[] {
  return renumber(items.filter(item => item.id !== id))
}

export function removeSubItem(items: NavItem[], parentId: string, subId: string): NavItem[] {
  return items.map(item =>
    item.id === parentId ? { ...item, dropdownItems: renumber((item.dropdownItems ?? []).filter(sub => sub.id !== subId)) } : item,
  )
}

/** Copie profonde (le menu d'origine ne doit jamais être modifié par l'éditeur). */
export function cloneNav(items: NavItem[]): NavItem[] {
  return items.map(item => ({ ...item, dropdownItems: item.dropdownItems ? item.dropdownItems.map(sub => ({ ...sub })) : undefined }))
}

/**
 * Monte (-1) ou descend (+1) un élément d'une place, sans glisser-déposer (boutons ▲ ▼ : fiable au toucher).
 * Hors limites : liste inchangée. Le même principe sert aux liens du menu et à ceux d'un menu déroulant.
 */
export function moveItemBy<T extends { position: number }>(items: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return items
  const next = [...items]
  ;[next[index], next[to]] = [next[to], next[index]]
  return renumber(next)
}

/** Indique si une adresse figure déjà dans le menu (y compris dans un menu déroulant). */
export function navHasHref(items: NavItem[], href: string): boolean {
  return items.some(item => item.href === href || (item.dropdownItems ?? []).some(sub => sub.href === href))
}

/**
 * Ajoute un lien visible au menu, avant le bouton d'action final (« Réserver une séance ») pour qu'il reste le dernier.
 * Si l'adresse y est déjà, le menu est renvoyé inchangé.
 */
export function addNavLink(items: NavItem[], label: string, href: string): NavItem[] {
  if (navHasHref(items, href)) return items
  const link: NavItem = { id: newId(), label: label.trim() || 'Nouvelle page', href, visible: true, position: 0 }
  const lastCta = items.map(i => !!i.isCta).lastIndexOf(true)
  const at = lastCta >= 0 && lastCta === items.length - 1 ? lastCta : items.length
  return renumber([...items.slice(0, at), link, ...items.slice(at)])
}

/** Retire du menu tous les liens vers une adresse (dans le menu et dans les menus déroulants). */
export function removeNavLinkByHref(items: NavItem[], href: string): NavItem[] {
  return renumber(
    items
      .filter(item => item.href !== href)
      .map(item => (item.dropdownItems ? { ...item, dropdownItems: renumber(item.dropdownItems.filter(sub => sub.href !== href)) } : item)),
  )
}

/** Monte ou descend d'une place un lien d'un menu déroulant (boutons ▲ ▼). */
export function moveSubItemBy(items: NavItem[], parentId: string, index: number, dir: -1 | 1): NavItem[] {
  return items.map(item => (item.id === parentId ? { ...item, dropdownItems: moveItemBy(item.dropdownItems ?? [], index, dir) } : item))
}
