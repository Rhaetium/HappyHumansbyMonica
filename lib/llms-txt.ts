// Construit le fichier /llms.txt : un résumé du site, lisible par les moteurs de réponse IA
// (ChatGPT, Claude, Perplexity…), au format https://llmstxt.org (Markdown : titre, résumé, listes de liens).
// Logique pure et testée ; la route app/llms.txt/route.ts ne fait que rassembler les données du CMS.
import { plainText, type FaqItem } from './json-ld'

export type LlmsLink = { title: string; url: string; description?: string }

export type LlmsInput = {
  siteName: string
  summary: string
  pages: LlmsLink[]
  /** Offres avec leur tarif (programmes, formules) : ce que les assistants IA citent le plus pour une question de prix. */
  offers?: LlmsLink[]
  posts: LlmsLink[]
  faq: FaqItem[]
}

// Libellés des sections du fichier (lus par les IA, pas affichés sur le site).
const SECTION = { pages: 'Pages principales', offers: 'Offres et tarifs', posts: 'Articles du blog', faq: 'Questions fréquentes' } as const

const MAX_POSTS = 20
const MAX_FAQ = 20
const DESC_MAX = 200
const ANSWER_MAX = 300

/** Coupe proprement à la limite d'un mot, avec « … ». */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

const oneLine = (s: string) => plainText(s)
/** Un titre dans [crochets] ne doit pas contenir de crochets : ils casseraient le lien Markdown. */
const linkTitle = (s: string) => oneLine(s).replace(/[[\]]/g, '')

function linkLine(l: LlmsLink): string {
  const desc = l.description ? truncate(oneLine(l.description), DESC_MAX) : ''
  return `- [${linkTitle(l.title)}](${l.url})${desc ? `: ${desc}` : ''}`
}

export function buildLlmsTxt(input: LlmsInput): string {
  const out: string[] = [`# ${oneLine(input.siteName)}`, '']

  const summary = oneLine(input.summary)
  if (summary) out.push(`> ${summary}`, '')

  const pages = input.pages.filter(p => p.title.trim() && p.url)
  if (pages.length) out.push(`## ${SECTION.pages}`, '', ...pages.map(linkLine), '')

  const offers = (input.offers ?? []).filter(o => o.title.trim() && o.url)
  if (offers.length) out.push(`## ${SECTION.offers}`, '', ...offers.map(linkLine), '')

  const posts = input.posts.filter(p => p.title.trim() && p.url).slice(0, MAX_POSTS)
  if (posts.length) out.push(`## ${SECTION.posts}`, '', ...posts.map(linkLine), '')

  const faq = input.faq
    .map(f => ({ q: oneLine(f.q ?? ''), a: oneLine(f.a ?? '') }))
    .filter(f => f.q && f.a)
    .slice(0, MAX_FAQ)
  if (faq.length) {
    out.push(`## ${SECTION.faq}`, '', ...faq.map(f => `- **${f.q}** ${truncate(f.a, ANSWER_MAX)}`), '')
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

/** Une offre telle que saisie dans le CMS (programme de coaching, formule entreprise). */
export type LlmsOfferInput = { name?: string; desc?: string; price?: string; unit?: string }

/** « Gratuit » → « gratuit », « Sur devis » → « sur devis », « 120 € » reste tel quel (jamais de prix inventé). */
export function priceLabel(price: string | undefined): string {
  const p = oneLine(price ?? '')
  if (!p) return ''
  return /^(gratuit|gratuite|offert|offerte|sur devis)$/i.test(p) ? p.toLowerCase() : p
}

/**
 * Offre → ligne de /llms.txt : nom, description, puis « Tarif : … » (avec la durée ou le format entre parenthèses).
 * Une offre sans nom est ignorée ; sans prix, la ligne ne mentionne aucun tarif.
 */
export function offerLink(offer: LlmsOfferInput, url: string): LlmsLink | null {
  const title = oneLine(offer.name ?? '')
  if (!title) return null
  const price = priceLabel(offer.price)
  const unit = oneLine(offer.unit ?? '')
  const desc = oneLine(offer.desc ?? '').replace(/[.\s]+$/, '')
  const parts = [desc ? `${desc}.` : '', price ? `Tarif : ${price}${unit ? ` (${unit})` : ''}.` : ''].filter(Boolean)
  return { title, url, description: parts.join(' ') || undefined }
}
