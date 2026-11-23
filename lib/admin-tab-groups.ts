// Regroupement des onglets de l'admin du CMS en cinq thèmes (une ligne de thèmes, puis les onglets du thème ouvert).
// Donnée pure, testée dans __tests__/lib/admin-tab-groups.test.ts : un onglet ajouté sans thème fait échouer le test.

export type TabGroup = { id: string; label: string; tabs: string[] }

export const TAB_GROUPS: TabGroup[] = [
  { id: 'accueil', label: '🏠 Accueil', tabs: ['dashboard', 'assistant', 'aide'] },
  { id: 'contenu', label: '✏️ Contenu', tabs: ['articles', 'new', 'pages', 'custom-pages', 'contenu', 'media', 'questionnaires'] },
  { id: 'visibilite', label: '🔍 Visibilité', tabs: ['visibilite', 'seo', 'stats-google'] },
  { id: 'site', label: '🧭 Site', tabs: ['menu', 'fil-ariane', 'redirections', 'ia', 'connexions', 'settings'] },
  { id: 'echanges', label: '💬 Échanges', tabs: ['booking', 'messages'] },
]

/** Thème d'un onglet. Un onglet inconnu retombe sur le premier thème (l'admin ne casse jamais). */
export function groupForTab(tabId: string): TabGroup {
  return TAB_GROUPS.find(g => g.tabs.includes(tabId)) ?? TAB_GROUPS[0]
}

/**
 * Les onglets d'un thème, dans l'ordre du thème, avec leur libellé et leur compteur.
 * Un onglet du thème absent de la liste fournie est ignoré.
 */
export function tabsOfGroup<T extends { id: string }>(group: TabGroup, allTabs: T[]): T[] {
  return group.tabs.map(id => allTabs.find(t => t.id === id)).filter((t): t is T => !!t)
}

/** Total des compteurs des onglets d'un thème (pastille du thème : messages non lus, corrections SEO…). */
export function groupCount(group: TabGroup, allTabs: { id: string; count: number | null }[]): number {
  return tabsOfGroup(group, allTabs).reduce((sum, t) => sum + (t.count ?? 0), 0)
}
