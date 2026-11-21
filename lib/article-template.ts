// Gabarit d'article « une question, un article » : modèle de départ, liste de contrôle en direct pendant l'écriture,
// et extraction de la FAQ de l'article pour son balisage FAQPage.
//
// La structure repose sur ce que lisent les moteurs et les assistants IA :
//   - le titre (et l'adresse) EST la question ;
//   - les ~50 premiers mots y répondent, avec un chiffre ou un prix quand c'est possible ;
//   - trois intertitres (H2) répondent aux sous-questions ;
//   - une section « Questions fréquentes » : un H3 par question, la réponse juste dessous ;
//   - une date de mise à jour visible.
// Fonctions pures (pas de React, pas de réseau), testées dans __tests__/lib/article-template.test.ts.

import { plainText } from '@/lib/json-ld'

export const FAQ_HEADING = 'Questions fréquentes'

/** Modèle inséré dans l'éditeur d'un nouvel article. Les crochets signalent ce qu'il faut remplacer. */
export const ARTICLE_TEMPLATE_HTML = [
  '<p><strong>[Réponse courte : environ 50 mots, avec un chiffre ou un prix si possible.]</strong></p>',
  '<h2>[Première sous-question ?]</h2>',
  '<p>[Réponse.]</p>',
  '<h2>[Deuxième sous-question ?]</h2>',
  '<p>[Réponse.]</p>',
  '<h2>[Troisième sous-question ?]</h2>',
  '<p>[Réponse.]</p>',
  `<h2>${FAQ_HEADING}</h2>`,
  '<h3>[Question 1 ?]</h3>',
  '<p>[Réponse.]</p>',
  '<h3>[Question 2 ?]</h3>',
  '<p>[Réponse.]</p>',
  '<h3>[Question 3 ?]</h3>',
  '<p>[Réponse.]</p>',
].join('\n')

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean)
const text = (html: string): string => plainText(decodeEntities(html.replace(/<[^>]+>/g, ' ')))

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&eacute;/g, 'é')
}

type Part = { level: 2 | 3 | 0; heading: string; body: string }

/** Découpe le HTML en parties : chaque H2 / H3 avec ce qui le suit jusqu'au titre suivant. Le texte avant le premier titre a le niveau 0. */
function splitByHeadings(html: string): Part[] {
  const tokens = (html || '').split(/(<h[23][^>]*>[\s\S]*?<\/h[23]>)/i)
  const parts: Part[] = []
  let current: Part = { level: 0, heading: '', body: '' }
  for (const tok of tokens) {
    const m = tok.match(/^<h([23])[^>]*>([\s\S]*?)<\/h[23]>$/i)
    if (m) {
      parts.push(current)
      current = { level: Number(m[1]) as 2 | 3, heading: text(m[2]), body: '' }
    } else {
      current.body += tok
    }
  }
  parts.push(current)
  return parts.filter(p => p.level !== 0 || p.body.trim())
}

const isFaqHeading = (h: string) => /^questions?\s+fr[ée]quentes?\b/i.test(h.trim())
const isPlaceholder = (s: string) => /^\[.*\]$/.test(s.trim()) || /\[[^\]]*\]/.test(s)

/** Premier paragraphe de l'article (la réponse courte), en texte brut. */
export function directAnswer(html: string): string {
  const first = (html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  return first ? text(first[1]) : ''
}

export type FaqPair = { q: string; a: string }

/**
 * Questions de la section « Questions fréquentes » : un H3 par question, la réponse est ce qui suit jusqu'au titre suivant.
 * Les modèles non remplis (« [Question 1 ?] ») et les questions sans réponse sont ignorés : on ne déclare jamais un modèle vide.
 */
export function extractFaq(html: string): FaqPair[] {
  const parts = splitByHeadings(html)
  const start = parts.findIndex(p => p.level === 2 && isFaqHeading(p.heading))
  if (start < 0) return []
  const out: FaqPair[] = []
  for (let i = start + 1; i < parts.length; i++) {
    const p = parts[i]
    if (p.level === 2) break // section suivante
    if (p.level !== 3) continue
    const q = p.heading
    const a = text(p.body)
    if (q && a && !isPlaceholder(q) && !isPlaceholder(a)) out.push({ q, a })
  }
  return out
}

export type TemplateCheck = { id: string; ok: boolean; label: string; hint: string }

/** Nombre de mots d'un slug : « combien-coute-atelier-cohesion » → 4. */
const slugWords = (slug: string) => slug.split('-').filter(Boolean).length

/**
 * Liste de contrôle du gabarit, recalculée à chaque frappe. Aucun point n'est bloquant : c'est un guide.
 * `ok` = respecté ; `hint` dit quoi faire sinon.
 */
export function checkArticle(input: { title?: string; slug?: string; html?: string; description?: string }): TemplateCheck[] {
  const title = (input.title ?? '').trim()
  const slug = (input.slug ?? '').trim()
  const html = input.html ?? ''
  const answer = directAnswer(html)
  const answerWords = words(answer)
  const parts = splitByHeadings(html)
  const faqIndex = parts.findIndex(p => p.level === 2 && isFaqHeading(p.heading))
  const h2Before = parts.filter((p, i) => p.level === 2 && !isFaqHeading(p.heading) && (faqIndex < 0 || i < faqIndex))
  const filledH2 = h2Before.filter(p => p.heading && !isPlaceholder(p.heading))
  const faq = extractFaq(html)
  const description = (input.description ?? '').trim()
  const hasPlaceholders = isPlaceholder(html.replace(/<[^>]+>/g, ' '))

  return [
    {
      id: 'title', ok: /\?\s*$/.test(title), label: 'Le titre est la question',
      hint: 'Formulez le titre comme la question que se pose le lecteur (« Combien coûte un atelier de cohésion ? »).',
    },
    {
      id: 'slug', ok: slugWords(slug) >= 3 && slugWords(slug) <= 9, label: 'L’adresse contient les mots de la question',
      hint: 'Entre 3 et 9 mots, par exemple « combien-coute-atelier-cohesion ».',
    },
    {
      id: 'answer', ok: answerWords.length >= 25 && answerWords.length <= 70 && !isPlaceholder(answer), label: 'Les premiers mots répondent (25 à 70 mots)',
      hint: `Le premier paragraphe doit répondre à la question${answerWords.length ? ` (il fait ${answerWords.length} mots)` : ''}.`,
    },
    {
      id: 'number', ok: /\d/.test(answer) && !isPlaceholder(answer), label: 'La réponse courte contient un chiffre ou un prix',
      hint: 'Un chiffre réel (prix, durée, nombre de séances) rend la réponse citable. N’en inventez pas : sinon, dites « sur devis ».',
    },
    {
      id: 'h2', ok: filledH2.length >= 3, label: 'Trois intertitres (H2) répondent aux sous-questions',
      hint: `Il en faut au moins 3 avant la FAQ (vous en avez ${filledH2.length}).`,
    },
    {
      id: 'faq', ok: faq.length >= 3, label: `Une section « ${FAQ_HEADING} » avec 3 questions`,
      hint: `Un intertitre H2 « ${FAQ_HEADING} », puis un H3 par question avec sa réponse dessous (vous en avez ${faq.length}).`,
    },
    {
      id: 'placeholders', ok: !hasPlaceholders, label: 'Aucun texte entre crochets restant',
      hint: 'Remplacez les passages [entre crochets] du modèle avant de publier.',
    },
    {
      id: 'description', ok: description.length >= 70 && description.length <= 158, label: 'La description Google fait 70 à 158 caractères',
      hint: `Renseignez la description (SEO) dans le cadre plus bas${description ? ` : elle fait ${description.length} caractères` : ''}.`,
    },
  ]
}

/** Date « mise à jour » à afficher : seulement si elle est postérieure d'au moins un jour à la publication. */
export function shouldShowUpdated(publishedAt: string | null | undefined, updatedAt: string | null | undefined): boolean {
  if (!publishedAt || !updatedAt) return false
  const p = Date.parse(publishedAt)
  const u = Date.parse(updatedAt)
  return Number.isFinite(p) && Number.isFinite(u) && u - p >= 24 * 3600 * 1000
}
