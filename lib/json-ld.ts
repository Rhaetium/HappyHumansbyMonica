// Données structurées (JSON-LD) et texte brut tiré des textes du CMS.

/**
 * Texte brut d'un texte du CMS : retire le mini-format de components/Rich.tsx
 * (**gras**, *italique*, [libellé](lien)) et aplatit les retours à la ligne.
 * Sert aux données structurées et à /llms.txt, où le formatage n'a aucun sens.
 */
export function plainText(rich: string): string {
  return rich
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * JSON sûr à placer dans une balise <script type="application/ld+json">.
 * Un texte contenant « </script> » fermerait la balise et laisserait du contenu s'exécuter :
 * on échappe donc < > & et les séparateurs de ligne Unicode.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029')
}

export type FaqItem = { q?: string; a?: string }

/** Schéma FAQPage à partir des questions de la page (vides ignorées). `null` s'il n'y en a aucune. */
export function faqPageSchema(items: FaqItem[]): Record<string, unknown> | null {
  const entries = items
    .map(i => ({ q: plainText(i.q ?? ''), a: plainText(i.a ?? '') }))
    .filter(i => i.q && i.a)
  if (entries.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(i => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  }
}

export type CrumbItem = { label: string; href: string }

/**
 * Schéma BreadcrumbList : le fil d'Ariane vu par Google (il peut l'afficher dans le résultat de recherche).
 * `null` s'il y a moins de deux étapes (l'accueil seul n'a pas de fil).
 */
export function breadcrumbListSchema(crumbs: CrumbItem[], baseUrl: string): Record<string, unknown> | null {
  const items = crumbs.map(c => ({ name: plainText(c.label), href: c.href })).filter(c => c.name)
  if (items.length < 2) return null
  const base = baseUrl.replace(/\/+$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${base}${c.href.startsWith('/') ? c.href : `/${c.href}`}`,
    })),
  }
}

/**
 * Schéma Service : une prestation de Monica (coaching, accompagnement d'entreprises…), à partir du titre et de la
 * description de la page. Uniquement des faits déjà publiés sur la page : ni prix ni zone inventés.
 * `null` si la page n'a pas de titre.
 */
export function serviceSchema(input: { name?: string; description?: string; url: string; providerName?: string }): Record<string, unknown> | null {
  const name = plainText(input.name ?? '')
  if (!name) return null
  const description = plainText(input.description ?? '')
  const provider = plainText(input.providerName ?? '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    ...(description ? { description } : {}),
    url: input.url,
    ...(provider ? { provider: { '@type': 'Person', name: provider } } : {}),
  }
}

