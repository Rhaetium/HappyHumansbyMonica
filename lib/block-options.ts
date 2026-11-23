// Réglages avancés des blocs personnalisés : fond, espacement, ancre (lien direct vers le bloc), masquage selon l'écran,
// et lecture des adresses de vidéo. Fichier SANS dépendance, partagé par le site, l'admin et les tests
// (__tests__/lib/block-options.test.ts). Les classes Tailwind sont écrites EN TOUTES LETTRES : Tailwind ne
// trouve pas celles qu'on assemble à la volée.

export type BlockBg = 'auto' | 'blanc' | 'creme' | 'vert' | 'sombre'
export type BlockSpace = 'compact' | 'normal' | 'ample'

export type BlockStyle = {
  bg?: BlockBg
  space?: BlockSpace
  /** Identifiant de l'ancre : « tarifs » permet le lien /ma-page#tarifs. */
  anchor?: string
  hideMobile?: boolean
  hideDesktop?: boolean
}

export const BG_OPTIONS: { value: BlockBg; label: string }[] = [
  { value: 'auto', label: 'Automatique (selon le bloc)' },
  { value: 'blanc', label: 'Blanc' },
  { value: 'creme', label: 'Crème (couleur douce du site)' },
  { value: 'vert', label: 'Couleur principale du site' },
  { value: 'sombre', label: 'Sombre' },
]

export const SPACE_OPTIONS: { value: BlockSpace; label: string }[] = [
  { value: 'compact', label: 'Serré' },
  { value: 'normal', label: 'Normal' },
  { value: 'ample', label: 'Aéré' },
]

const BGS = new Set<string>(['auto', 'blanc', 'creme', 'vert', 'sombre'])
const SPACES = new Set<string>(['compact', 'normal', 'ample'])

/** « Mes Tarifs ! » → « mes-tarifs » (sans accent, lettres, chiffres et tirets seulement). */
export function normalizeAnchor(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Style sûr : toute valeur inconnue est ignorée (le site ne casse jamais sur un JSON abîmé). */
export function normalizeStyle(raw: unknown): BlockStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const style: BlockStyle = {}
  if (typeof r.bg === 'string' && BGS.has(r.bg) && r.bg !== 'auto') style.bg = r.bg as BlockBg
  if (typeof r.space === 'string' && SPACES.has(r.space) && r.space !== 'normal') style.space = r.space as BlockSpace
  if (typeof r.anchor === 'string') { const a = normalizeAnchor(r.anchor); if (a) style.anchor = a }
  if (r.hideMobile === true) style.hideMobile = true
  if (r.hideDesktop === true) style.hideDesktop = true
  return Object.keys(style).length ? style : undefined
}

const BG_CLASS: Record<Exclude<BlockBg, 'auto'>, string> = {
  blanc: '[&>section]:!bg-white',
  creme: '[&>section]:!bg-[color:var(--hh-bg)]',
  vert:
    '[&>section]:!bg-[color:var(--hh-primary)] [&_h2]:!text-white [&_h3]:!text-white [&_p]:!text-emerald-50 [&_li]:!text-emerald-50 [&_dt]:!text-white [&_dd]:!text-emerald-100 [&_summary]:!text-white [&_span]:!text-emerald-50',
  sombre:
    '[&>section]:!bg-stone-900 [&_h2]:!text-white [&_h3]:!text-white [&_p]:!text-stone-200 [&_li]:!text-stone-200 [&_dt]:!text-white [&_dd]:!text-stone-300 [&_summary]:!text-white [&_span]:!text-stone-200',
}

const SPACE_CLASS: Record<Exclude<BlockSpace, 'normal'>, string> = {
  compact: '[&>section]:!py-6 md:[&>section]:!py-8',
  ample: '[&>section]:!py-20 md:[&>section]:!py-28',
}

/** Classes du conteneur d'un bloc ; chaîne vide si aucun réglage (le bloc s'affiche alors exactement comme avant). */
export function wrapperClasses(style: BlockStyle | undefined): string {
  if (!style) return ''
  const out: string[] = []
  if (style.bg) out.push(BG_CLASS[style.bg as Exclude<BlockBg, 'auto'>])
  if (style.space) out.push(SPACE_CLASS[style.space as Exclude<BlockSpace, 'normal'>])
  if (style.hideMobile) out.push('max-md:hidden')
  if (style.hideDesktop) out.push('md:hidden')
  return out.join(' ')
}

// ── Vidéos : seulement des lecteurs « respectueux de la vie privée », jamais une adresse libre ──

/** Adresse d'intégration (iframe) d'une vidéo YouTube ou Vimeo, ou null. YouTube passe par youtube-nocookie.com (pas de cookie avant la lecture). */
export function videoEmbedUrl(input: string): string | null {
  let url: URL
  try { url = new URL(input.trim()) } catch { return null }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
  const id = (s: string | null | undefined) => (s && /^[\w-]{6,20}$/.test(s) ? s : null)

  if (host === 'youtu.be') {
    const v = id(url.pathname.slice(1).split('/')[0])
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const v = parts[0] === 'watch' ? id(url.searchParams.get('v'))
      : ['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? id(parts[1]) : null
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const num = parts.find(p => /^\d{6,12}$/.test(p))
    return num ? `https://player.vimeo.com/video/${num}?dnt=1` : null
  }
  return null
}

// ── Lignes à plusieurs colonnes : « a | b | c » ──

export function splitColumns(line: string, max: number): string[] {
  const parts = line.split('|').map(p => p.trim())
  if (parts.length > max) return [...parts.slice(0, max - 1), parts.slice(max - 1).join(' | ')]
  return parts
}

/** Cartes : une ligne « Emoji | Titre | Texte » (l'emoji est facultatif : « Titre | Texte » marche aussi). */
export function parseCardLines(text: string | undefined): { icon: string; title: string; text: string }[] {
  return (text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const cols = splitColumns(line, 3)
    // Un seul « | » : « Titre | Texte » ; sinon la première colonne est l'emoji s'il est court
    if (cols.length === 1) return { icon: '', title: cols[0], text: '' }
    if (cols.length === 2) return { icon: '', title: cols[0], text: cols[1] }
    return { icon: cols[0].slice(0, 8), title: cols[1], text: cols[2] }
  }).filter(c => c.title)
}

/** Témoignages : une ligne « Texte | Prénom, rôle ». Rien n'est inventé : seul ce que Monica écrit s'affiche. */
export function parseTestimonialLines(text: string | undefined): { quote: string; author: string }[] {
  return (text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const cols = splitColumns(line, 2)
    return { quote: cols[0], author: cols[1] ?? '' }
  }).filter(t => t.quote)
}
