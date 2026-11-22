// Destination d'un bouton saisie dans le CMS (champs « … — destination »). Une adresse venant de la base n'est jamais fiable :
// on n'accepte que les formes sûres et on retombe sur l'adresse d'origine du bouton sinon (jamais de « javascript: »).
// Logique pure, testée dans __tests__/lib/safe-href.test.ts.

/**
 * Adresses acceptées : une page du site (« /coaching », « /booking?from=coaching »), une ancre (« #contact »),
 * un lien complet « https://… », « mailto:… » ou « tel:… ». Tout le reste (vide, « javascript: », « //autre-site », « http: »…)
 * renvoie `fallback`.
 */
export function safeHref(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  if (/^tel:\+?[0-9 .()-]{3,}$/i.test(v)) return v // un numéro s'écrit naturellement avec des espaces
  if (!v || /[\s<>"'`\\\u0000-\u001f]/.test(v)) return fallback
  if (v.startsWith('//')) return fallback // adresse « protocole relatif » : renverrait vers un autre site sans que Monica le voie
  if (v.startsWith('/') || v.startsWith('#')) return v
  if (/^https:\/\/[^/]+/i.test(v)) return v
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(v)) return v
  return fallback
}

/** Lien qui sort du site : à ouvrir avec rel="noopener noreferrer". */
export function isExternalHref(href: string): boolean {
  return /^https:\/\//i.test(href)
}
