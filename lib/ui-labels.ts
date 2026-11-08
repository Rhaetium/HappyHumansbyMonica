// Libellés d'accessibilité partagés (attributs aria-label, non visibles à l'écran).
// Centralisés ici pour qu'aucun libellé ne reste en dur dans les composants.
export const UI_LABELS = {
  menu: 'Menu',
  breadcrumb: 'Fil d’Ariane',
  homeLink: (siteName: string) => `${siteName} accueil`,
} as const
