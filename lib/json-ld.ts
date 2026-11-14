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
