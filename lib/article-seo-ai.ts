// Suggestions de référencement pour un article : titre SEO, description Google et accroche, écrits par l'IA d'après le texte.
// Les propositions sont mises dans les champs de l'éditeur (Monica relit et enregistre) : rien n'est publié par ce fichier.
// Logique pure (consigne, lecture et mise à la bonne longueur de la réponse), testée dans __tests__/lib/article-seo-ai.test.ts.

export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 155
export const EXCERPT_MAX = 220
const CONTENT_CHARS = 4000

export type ArticleSeoSuggestion = { seo_title: string; seo_description: string; excerpt: string }

export const ARTICLE_SEO_SYSTEM = `Tu aides Monica Schneider (coaching, relations, sparring partner, happiness design) à bien référencer ses articles de blog sur Google et dans les assistants IA.
Ton : chaleureux, direct, concret, en français, au « vous ». Aucune promesse de résultat, aucun chiffre ni citation inventé.
À partir du titre et du texte de l'article, écris :
- "seo_title" : au plus ${SEO_TITLE_MAX} caractères, contient l'idée principale, sans guillemets, sans « | Happy Humans » (ajouté automatiquement) ;
- "seo_description" : entre 120 et ${SEO_DESCRIPTION_MAX} caractères, répond à ce que cherche le lecteur et donne envie de cliquer, une ou deux phrases ;
- "excerpt" : une accroche de ${EXCERPT_MAX} caractères au plus, pour la liste des articles.
Reste fidèle au contenu : ne mentionne rien qui n'est pas dans l'article.
Réponds par UN SEUL objet JSON, sans texte autour : {"seo_title":"…","seo_description":"…","excerpt":"…"}`

/** Texte brut d'un contenu HTML d'article, tronqué. */
export function plainText(html: string, max = CONTENT_CHARS): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|div|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()
  return text.length > max ? text.slice(0, max) : text
}

export function buildArticleSeoPrompt(title: string, content: string, category?: string | null): string {
  return `Titre de l'article : « ${title.trim()} »${category ? `\nCatégorie : ${category}` : ''}\n\nTexte :\n${plainText(content)}`
}

/** Coupe au dernier mot entier avant la limite (jamais au milieu d'un mot, sans « … »). */
export function fitLength(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : t.slice(0, max)
  return base.replace(/[\s,;:.\-–—]+$/, '')
}

const stripQuotes = (s: string) => s.trim().replace(/^[«"“]\s*|\s*[»"”]$/g, '').trim()

/** Lit la réponse du modèle ; null si elle est inexploitable (aucun des trois champs). */
export function parseArticleSeoResponse(raw: string): ArticleSeoSuggestion | null {
  const text = raw.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  let data: Record<string, unknown>
  try { data = JSON.parse(body.slice(start, end + 1)) } catch { return null }
  const field = (k: string, max: number) => (typeof data[k] === 'string' ? fitLength(stripQuotes(data[k] as string), max) : '')
  const result = {
    seo_title: field('seo_title', SEO_TITLE_MAX),
    seo_description: field('seo_description', SEO_DESCRIPTION_MAX),
    excerpt: field('excerpt', EXCERPT_MAX),
  }
  return result.seo_title || result.seo_description || result.excerpt ? result : null
}
