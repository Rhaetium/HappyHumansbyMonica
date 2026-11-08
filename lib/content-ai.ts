// Consignes et lecture des réponses pour les générateurs de l'admin (articles de blog, carrousels Instagram).
// Logique pure, testée dans __tests__/lib/content-ai.test.ts. L'appel au modèle passe par lib/ai-text.ts.
//
// Historique : ces générateurs venaient de l'ancien site de voyage (Heldonica) et produisaient des
// récits de voyage. Ils sont maintenant écrits pour Happy Humans (coaching).
import { extractJsonObject } from '@/lib/questionnaire-ai'

const VOICE = `Tu écris pour Happy Humans, le site de Monica Schneider : coaching individuel, relations, sparring partner pour dirigeants, accompagnement des organisations et « happiness design ».
Ton : chaleureux, direct, concret, en français, au « vous ». Tu ne poses aucun diagnostic, tu ne donnes pas de conseil médical et tu ne promets pas de résultats.
Tu n'inventes ni chiffres, ni études, ni citations, ni témoignages de clients.`

// ── Blog ────────────────────────────────────────────────────────────────────

export type BlogStyle = 'story' | 'guide' | 'list' | 'review'
export type BlogLength = 'short' | 'medium' | 'long'

const BLOG_STYLES: Record<BlogStyle, string> = {
  story: 'Partant d’une situation vécue typique (générique, sans personne réelle), raconte puis tire des enseignements.',
  guide: 'Guide pratique : sections claires, étapes concrètes, exercices simples à faire seul.',
  list: 'Liste numérotée de conseils concrets, chacun expliqué en quelques phrases.',
  review: 'Réflexion personnelle et nuancée sur la question, avec des pistes pour avancer.',
}

const BLOG_LENGTHS: Record<BlogLength, { words: string; tokens: number }> = {
  short: { words: '300 à 400 mots', tokens: 900 },
  medium: { words: '600 à 800 mots', tokens: 1600 },
  long: { words: '1000 à 1200 mots', tokens: 2600 },
}

export function blogStyle(v: unknown): BlogStyle {
  return typeof v === 'string' && v in BLOG_STYLES ? (v as BlogStyle) : 'story'
}

export function blogLength(v: unknown): BlogLength {
  return typeof v === 'string' && v in BLOG_LENGTHS ? (v as BlogLength) : 'medium'
}

export const BLOG_SYSTEM = `${VOICE}
Tu rédiges des articles de blog utiles et agréables à lire.`

export function blogMaxTokens(length: BlogLength): number {
  return BLOG_LENGTHS[length].tokens
}

export function buildBlogPrompt(topic: string, style: BlogStyle, length: BlogLength): string {
  return `Rédige un article de blog.

Sujet : ${topic.trim()}
Approche : ${BLOG_STYLES[style]}
Longueur : ${BLOG_LENGTHS[length].words}

Format obligatoire (Markdown) :
# Titre accrocheur
Une phrase d'accroche de 200 caractères maximum.
## Intertitre
Paragraphes…
## Pour aller plus loin
Une conclusion qui invite à réfléchir ou à échanger, sans pression commerciale.
#hashtag1 #hashtag2 #hashtag3 (5 à 8 hashtags en dernière ligne)

Réponds uniquement avec l'article, sans préambule.`
}

export type BlogDraft = {
  title: string
  excerpt: string
  content: string
  hashtags: string[]
  suggestedSlug: string
}

const HASHTAG_RE = /#[\p{L}\p{N}_-]+/gu

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '')
}

/** Découpe la réponse Markdown du modèle : titre (H1), accroche, corps (sans H1 ni ligne de hashtags). */
export function parseBlogResponse(raw: string): BlogDraft {
  const lines = raw.replace(/\r\n/g, '\n').trim().split('\n')
  const isHashtagLine = (l: string) => {
    const t = l.trim()
    return t.startsWith('#') && !/^#{1,6}\s/.test(t) && t.replace(HASHTAG_RE, '').trim() === ''
  }

  const h1Index = lines.findIndex(l => /^#\s+\S/.test(l.trim()))
  const title = (h1Index >= 0 ? lines[h1Index].trim().replace(/^#\s+/, '') : lines.find(l => l.trim())?.trim() ?? '')
    .replace(/\*\*/g, '')
    .slice(0, 200)

  const body = lines.filter((l, i) => i !== h1Index && !isHashtagLine(l))
  // L'accroche est la première ligne de texte avant tout intertitre ; elle est retirée du corps
  // (sinon le blog l'affiche deux fois : en résumé puis en tête de l'article).
  const firstText = body.findIndex(l => l.trim())
  const hasLead = firstText >= 0 && !body[firstText].trim().startsWith('#')
  const excerpt = hasLead ? body[firstText].trim().replace(/\*\*/g, '').slice(0, 200) : ''
  if (hasLead && excerpt.length < 200) body.splice(firstText, 1)

  const hashtagLines = lines.filter(isHashtagLine).join(' ')
  const hashtags = [...new Set((hashtagLines.match(HASHTAG_RE) ?? []).map(h => h.toLowerCase()))].slice(0, 12)

  return {
    title,
    excerpt,
    content: body.join('\n').trim(),
    hashtags,
    suggestedSlug: slugFromTitle(title),
  }
}

// ── Carrousel Instagram ─────────────────────────────────────────────────────

export const CAROUSEL_SYSTEM = `${VOICE}
Tu crées des carrousels Instagram : une idée par slide, phrases courtes, lisibles sur mobile.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"title":"titre du carrousel","slides":[{"title":"titre court","content":"2 ou 3 phrases maximum"}],"caption":"légende Instagram de 2 à 4 phrases, qui invite à commenter","hashtags":["#exemple"]}`

export function buildCarouselPrompt(topic: string): string {
  return `Crée un carrousel de 5 slides sur : ${topic.trim()}
Slide 1 : une accroche qui donne envie de faire défiler. Slide 5 : une question ou une invitation à réfléchir.
8 à 12 hashtags en français.`
}

export type CarouselSlide = { title: string; content: string }
export type CarouselDraft = { title: string; slides: CarouselSlide[]; caption: string; hashtags: string[] }

/** Lit et nettoie le JSON du modèle. Lève une erreur si aucune slide exploitable. */
export function parseCarouselResponse(raw: string, topic: string): CarouselDraft {
  const data = (extractJsonObject(raw) ?? {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const slides = (Array.isArray(data.slides) ? data.slides : [])
    .map(s => (s && typeof s === 'object' ? (s as Record<string, unknown>) : {}))
    .map(s => ({ title: text(s.title), content: text(s.content) }))
    .filter(s => s.title || s.content)
    .slice(0, 10)
  if (!slides.length) throw new Error('Aucune slide dans la réponse.')
  let caption = text(data.caption)
  let hashtags = (Array.isArray(data.hashtags) ? data.hashtags : [])
    .map(text)
    .filter(Boolean)
    .map(h => (h.startsWith('#') ? h : `#${h}`).replace(/\s+/g, ''))
  // Certains modèles glissent les hashtags dans la légende : on les en sort.
  const inCaption = caption.match(HASHTAG_RE) ?? []
  if (inCaption.length) {
    hashtags = [...hashtags, ...inCaption]
    caption = caption.replace(HASHTAG_RE, '').replace(/[ \t]{2,}/g, ' ').trim()
  }
  return {
    title: text(data.title) || topic.trim(),
    slides,
    caption,
    hashtags: [...new Set(hashtags.map(h => h.toLowerCase()))].slice(0, 15),
  }
}
