// Assistant « Créer une page » : Monica décrit la page qu'elle veut, l'IA propose un brouillon complet fait des blocs du CMS.
// La page est créée HORS LIGNE : Monica la relit, ajoute ses vraies photos puis la met en ligne.
// Garde-fous (pas de chiffres, témoignages, photos ni liens inventés) appliqués ici, pas seulement demandés à l'IA.
// Logique pure, testée dans __tests__/lib/page-builder.test.ts.

import { makeId, type CustomBlock } from '@/lib/custom-sections'
import { slugify, type CustomPage } from '@/lib/custom-pages'
import { normalizePath } from '@/lib/redirects'

export const MAX_DESCRIPTION_CHARS = 800
export const MAX_BLOCKS = 10

/** Pages du site vers lesquelles l'IA peut faire pointer un bouton (jamais un lien inventé). */
export const LINK_CHOICES: { href: string; label: string }[] = [
  { href: '/contact', label: 'Contact' },
  { href: '/booking', label: 'Prendre rendez-vous' },
  { href: '/coaching', label: 'Coaching' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/entreprises', label: 'Entreprises' },
  { href: '/sparring-partner', label: 'Sparring partner' },
  { href: '/happiness-design', label: 'Happiness design' },
  { href: '/relations', label: 'Relations' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'Questions fréquentes' },
]

export const PAGE_BUILDER_SYSTEM = `Tu aides Monica Schneider à créer une nouvelle page de son site Happy Humans (coaching, relations, sparring partner, accompagnement des organisations, « happiness design »).
Ton : chaleureux, direct, concret, en français, au « vous ». Pas de diagnostic, pas de conseil médical, aucune promesse de résultat.
JAMAIS de chiffre, de statistique, de prix, de date, de nom de client, de témoignage ni de citation inventés : si Monica ne les donne pas, ne les écris pas (tu peux écrire un passage « [à compléter : prix] » entre crochets quand une information manque).
Pas d'image : laisse "image" vide.
Construis la page avec 4 à 8 blocs au plus, parmi ces types exacts :
- {"type":"texte","badge":"","title":"","text":"","align":"left"}  (paragraphes ; "align" = "left" ou "center")
- {"type":"split","badge":"","title":"","text":"","image":"","layout":"image-right","ctaLabel":"","ctaHref":""}  (titre + texte à côté d'une image que Monica ajoutera)
- {"type":"cartes","badge":"","title":"","text":"emoji | titre | texte\\nemoji | titre | texte"}  (3 à 4 atouts, une ligne par carte)
- {"type":"liste","badge":"","title":"","text":"un point par ligne"}
- {"type":"faq","badge":"","title":"","items":[{"q":"","a":""}]}  (3 à 6 questions réelles que se posent les lecteurs)
- {"type":"cta","title":"","text":"","button":"","href":""}  (appel à l'action final)
- {"type":"bouton","label":"","href":"","align":"center"}
Les adresses de boutons ("href", "ctaHref") doivent être EXACTEMENT l'une de celles-ci : ${LINK_CHOICES.map(l => `${l.href} (${l.label})`).join(', ')}.
Termine presque toujours par un bloc "cta" vers /contact ou /booking.
Réponds par UN SEUL objet JSON, sans texte autour :
{"title":"titre de la page","intro":"une à deux phrases d'introduction","seoTitle":"60 caractères au plus","seoDescription":"155 caractères au plus","blocks":[ … ]}`

export function buildPageBuilderPrompt(description: string): string {
  return `Page souhaitée par Monica : « ${description.trim()} »`
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const allowedHrefs = new Set(LINK_CHOICES.map(l => l.href))

/** Lien accepté seulement s'il mène à une page connue du site ; sinon null. */
function safeHref(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const path = normalizePath(v)
  return allowedHrefs.has(path) ? path : null
}

export type PageProposal = { page: Omit<CustomPage, 'id' | 'slug'> & { slug: string }; notes: string[] }

/** Lit la réponse de l'IA : ne garde que des blocs permis, aux textes bornés, sans image ni lien hors de la liste. */
export function parsePageProposal(raw: string): PageProposal | null {
  const text = raw.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  let data: Record<string, unknown>
  try { data = JSON.parse(body.slice(start, end + 1)) } catch { return null }

  const notes: string[] = []
  const blocks: CustomBlock[] = []
  const list = Array.isArray(data.blocks) ? data.blocks : []
  for (const item of list) {
    if (blocks.length >= MAX_BLOCKS) { notes.push('Blocs en trop ignorés.'); break }
    const b = (item ?? {}) as Record<string, unknown>
    const id = makeId()
    const badge = clip(b.badge, 60), title = clip(b.title, 120)
    switch (b.type) {
      case 'texte': {
        const t = clip(b.text, 2000)
        if (t) blocks.push({ id, type: 'texte', ...(badge && { badge }), ...(title && { title }), text: t, align: b.align === 'center' ? 'center' : 'left' })
        break
      }
      case 'split': {
        const t = clip(b.text, 1500)
        if (!t && !title) break
        const href = safeHref(b.ctaHref), label = clip(b.ctaLabel, 40)
        blocks.push({ id, type: 'split', ...(badge && { badge }), title, text: t, image: '', layout: b.layout === 'image-left' ? 'image-left' : 'image-right', ...(href && label ? { ctaLabel: label, ctaHref: href } : {}) })
        break
      }
      case 'cartes': {
        const t = clip(b.text, 1500)
        if (t) blocks.push({ id, type: 'cartes', ...(badge && { badge }), ...(title && { title }), text: t })
        break
      }
      case 'liste': {
        const t = clip(b.text, 1500)
        if (t) blocks.push({ id, type: 'liste', ...(badge && { badge }), ...(title && { title }), text: t })
        break
      }
      case 'faq': {
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8)
          .map(i => ({ q: clip((i as Record<string, unknown>)?.q, 200), a: clip((i as Record<string, unknown>)?.a, 800) }))
          .filter(i => i.q && i.a)
        if (items.length) blocks.push({ id, type: 'faq', ...(badge && { badge }), ...(title && { title }), items })
        break
      }
      case 'cta': {
        const button = clip(b.button, 40), t = clip(b.text, 400)
        const href = safeHref(b.href)
        if (!title || !button) break
        if (!href) notes.push(`Le bouton « ${button} » pointait vers une adresse inconnue : il mène à /contact.`)
        blocks.push({ id, type: 'cta', title, ...(t && { text: t }), button, href: href ?? '/contact' })
        break
      }
      case 'bouton': {
        const label = clip(b.label, 40)
        const href = safeHref(b.href)
        if (!label) break
        if (!href) notes.push(`Le bouton « ${label} » pointait vers une adresse inconnue : il mène à /contact.`)
        blocks.push({ id, type: 'bouton', label, href: href ?? '/contact', align: b.align === 'left' ? 'left' : 'center' })
        break
      }
      case 'temoignages': case 'chiffres': case 'citation': case 'video': case 'image':
        notes.push(`Bloc « ${String(b.type)} » retiré : il demande de vraies données, photos ou citations de Monica (à ajouter vous-même).`)
        break
      default:
        break
    }
  }
  if (blocks.length === 0) return null

  const title = clip(data.title, 90) || 'Nouvelle page'
  return {
    page: {
      slug: slugify(title) || 'nouvelle-page',
      title,
      intro: clip(data.intro, 400),
      published: false,
      blocks,
      seoTitle: clip(data.seoTitle, 70),
      seoDescription: clip(data.seoDescription, 160),
      seoImage: '',
    },
    notes,
  }
}

/** Résumé d'un bloc pour l'aperçu avant création. */
export function blockSummary(b: CustomBlock): string {
  const title = 'title' in b && b.title ? String(b.title) : ''
  if (b.type === 'bouton') return `Bouton « ${b.label} »`
  if (b.type === 'cta') return `Appel à l'action : ${b.title}`
  if (b.type === 'faq') return `Questions fréquentes (${b.items.length})${title ? ` — ${title}` : ''}`
  const name = { texte: 'Texte', split: 'Texte + image', cartes: 'Cartes', liste: 'Liste', chiffres: 'Chiffres', temoignages: 'Témoignages', video: 'Vidéo', image: 'Image', citation: 'Citation', espace: 'Espace' }[b.type]
  return `${name}${title ? ` — ${title}` : ''}`
}
