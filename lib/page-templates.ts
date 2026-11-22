// Modèles de pages libres : une page préremplie (blocs, FAQ, appel à l'action, SEO) à adapter, au lieu d'une page vide.
// Les textes ne reprennent que des faits déjà publiés sur le site (séance découverte gratuite, séance individuelle à 120 €,
// programmes sur devis) ; tout le reste est entre [crochets] à remplir. Une page créée est toujours hors ligne au départ.
// Fonctions pures, testées dans __tests__/lib/page-templates.test.ts.

import { makeId, type CustomBlock } from './custom-sections'
import { blankPage, type CustomPage } from './custom-pages'

type BlockDraft = CustomBlock extends infer B ? (B extends { id: string } ? Omit<B, 'id'> : never) : never

export type PageTemplate = {
  id: string
  label: string
  emoji: string
  description: string
  /** Adresse proposée (rendue unique à la création). */
  slug: string
  title: string
  intro: string
  seoTitle: string
  seoDescription: string
  /** Blocs, sans identifiant (ajoutés à la création pour que chaque page ait les siens). */
  blocks: BlockDraft[]
}

const CTA_CONTACT = { type: 'cta', title: 'Parlons de votre situation', text: 'Un premier échange gratuit pour voir si je peux vous aider.', button: 'Réserver une séance découverte', href: '/booking' } as const

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'vierge', label: 'Page vierge', emoji: '📄',
    description: 'Un titre et rien d’autre : vous ajoutez les blocs vous-même.',
    slug: 'nouvelle-page', title: 'Nouvelle page', intro: '', seoTitle: '', seoDescription: '', blocks: [],
  },
  {
    id: 'offre', label: 'Présenter une offre', emoji: '🎯',
    description: 'Pour qui, ce que vous obtenez, comment ça se passe, questions fréquentes, appel à l’action.',
    slug: 'mon-offre', title: '[Nom de l’offre]',
    intro: '[En une ou deux phrases : à qui s’adresse cette offre et ce qu’elle change concrètement.]',
    seoTitle: '[Nom de l’offre] avec Monica Schneider',
    seoDescription: '[Décrivez l’offre en une phrase de 70 à 155 caractères : pour qui, quel résultat, avec quel accompagnement.]',
    blocks: [
      { type: 'liste', badge: 'Pour qui', title: 'Cette offre est faite pour vous si…', text: '[Situation 1]\n[Situation 2]\n[Situation 3]' },
      { type: 'split', badge: 'Le principe', title: 'Comment ça se passe', text: '[Décrivez le déroulé : nombre de séances, rythme, durée, en visio ou en présentiel.]', image: '', layout: 'image-right' },
      { type: 'liste', badge: 'Résultats', title: 'Ce que vous repartez avec', text: '[Résultat concret 1]\n[Résultat concret 2]\n[Résultat concret 3]' },
      { type: 'faq', badge: 'Questions fréquentes', title: 'Vos questions', items: [
        { q: 'Combien ça coûte ?', a: '[Indiquez le tarif réel, ou « sur devis » après un premier échange gratuit.]' },
        { q: 'Comment démarrer ?', a: 'Par une séance découverte gratuite : on clarifie votre situation et on voit si l’accompagnement vous convient.' },
        { q: '[Question fréquente 3]', a: '[Réponse]' },
      ] },
      CTA_CONTACT,
    ],
  },
  {
    id: 'tarifs', label: 'Tarifs', emoji: '💶',
    description: 'Une page claire des prix : ce qui est affiché est cité par Google et les assistants IA.',
    slug: 'tarifs', title: 'Tarifs de l’accompagnement',
    intro: 'Un premier échange est offert. Voici ce que coûte chaque formule, sans surprise.',
    seoTitle: 'Tarifs du coaching — Monica Schneider',
    seoDescription: 'Séance découverte gratuite, séance individuelle à 120 €, programmes sur devis : les tarifs du coaching de Monica Schneider.',
    blocks: [
      { type: 'chiffres', title: 'En un coup d’œil', text: '0 € | Séance découverte\n120 € | Séance individuelle\nSur devis | Programmes' },
      { type: 'texte', badge: 'Séance découverte', title: 'Gratuite, sans engagement', text: 'Un premier échange pour clarifier votre situation et voir si le coaching vous convient.', align: 'left' },
      { type: 'texte', badge: 'Séance individuelle', title: '120 € la séance', text: '[Durée de la séance, format (visio ou présentiel), ce qui est inclus.]', align: 'left' },
      { type: 'texte', badge: 'Programmes', title: 'Sur devis', text: 'Le Programme Prise de Poste et le Programme Happiness Design sont proposés sur devis, après un premier échange. [Précisez ce qui fait varier le prix.]', align: 'left' },
      { type: 'faq', badge: 'Questions fréquentes', title: 'Sur les tarifs', items: [
        { q: 'Comment régler une séance ?', a: '[Moyens de paiement acceptés.]' },
        { q: 'Peut-on annuler une séance ?', a: '[Conditions d’annulation, à valider avec Monica.]' },
        { q: 'Les programmes sont-ils finançables ?', a: '[Réponse, ou retirez cette question.]' },
      ] },
      CTA_CONTACT,
    ],
  },
  {
    id: 'atelier', label: 'Atelier ou événement', emoji: '🗓️',
    description: 'Présentation, programme, informations pratiques et inscription.',
    slug: 'atelier', title: '[Nom de l’atelier]',
    intro: '[Une phrase : le thème de l’atelier, pour qui, et ce que les participants emportent.]',
    seoTitle: '[Nom de l’atelier] — Happy Humans',
    seoDescription: '[Thème, public, durée et lieu de l’atelier en une phrase de 70 à 155 caractères.]',
    blocks: [
      { type: 'split', badge: 'L’atelier', title: 'De quoi s’agit-il ?', text: '[Présentez le thème et l’approche en quelques lignes.]', image: '', layout: 'image-left' },
      { type: 'liste', badge: 'Programme', title: 'Au programme', text: '[Temps 1]\n[Temps 2]\n[Temps 3]' },
      { type: 'chiffres', title: 'Informations pratiques', text: '[Date] | Quand\n[Durée] | Combien de temps\n[Lieu ou visio] | Où' },
      { type: 'faq', badge: 'Questions fréquentes', title: 'Avant de vous inscrire', items: [
        { q: 'À qui s’adresse l’atelier ?', a: '[Public visé.]' },
        { q: 'Faut-il se préparer ?', a: '[Réponse.]' },
        { q: 'Comment s’inscrire ?', a: '[Marche à suivre.]' },
      ] },
      { type: 'cta', title: 'Réservez votre place', text: '[Nombre de places, date limite.]', button: 'Je m’inscris', href: '/contact' },
    ],
  },
  {
    id: 'temoignages', label: 'Témoignages', emoji: '💬',
    description: 'Trois citations de personnes accompagnées, avec un appel à l’action.',
    slug: 'temoignages-clients', title: 'Ce qu’en disent les personnes accompagnées',
    intro: '[Une phrase d’introduction. Ne publiez que des témoignages que leurs auteurs ont acceptés de voir en ligne.]',
    seoTitle: 'Témoignages — coaching Monica Schneider',
    seoDescription: '[Résumez en une phrase de 70 à 155 caractères ce que disent les personnes accompagnées.]',
    blocks: [
      { type: 'citation', quote: '[Témoignage 1, mot pour mot.]', author: '[Prénom, rôle ou ville]' },
      { type: 'citation', quote: '[Témoignage 2, mot pour mot.]', author: '[Prénom, rôle ou ville]' },
      { type: 'citation', quote: '[Témoignage 3, mot pour mot.]', author: '[Prénom, rôle ou ville]' },
      CTA_CONTACT,
    ],
  },
]

export function templateById(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find(t => t.id === id)
}

/** Nouvelle page (hors ligne, adresse libre, identifiants neufs) à partir d'un modèle ; modèle inconnu = page vierge. */
export function pageFromTemplate(pages: CustomPage[], templateId: string): CustomPage {
  const t = templateById(templateId)
  const base = blankPage(pages)
  if (!t || t.id === 'vierge') return base
  const taken = new Set(pages.map(p => p.slug))
  let slug = t.slug, i = 2
  while (taken.has(slug)) slug = `${t.slug}-${i++}`
  return {
    ...base,
    slug,
    title: t.title,
    intro: t.intro,
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    blocks: t.blocks.map(b => ({ ...(JSON.parse(JSON.stringify(b)) as BlockDraft), id: makeId() }) as CustomBlock),
  }
}

/** Passages [entre crochets] restant à remplacer dans le titre, l'accroche, le SEO et les blocs. */
export function placeholders(page: Pick<CustomPage, 'title' | 'intro' | 'seoTitle' | 'seoDescription' | 'blocks'>): string[] {
  const texts: string[] = [page.title, page.intro, page.seoTitle, page.seoDescription]
  for (const b of page.blocks) {
    for (const v of Object.values(b)) {
      if (typeof v === 'string') texts.push(v)
      else if (Array.isArray(v)) for (const it of v) if (it && typeof it === 'object') for (const s of Object.values(it)) if (typeof s === 'string') texts.push(s)
    }
  }
  const found: string[] = []
  for (const t of texts) for (const m of t.match(/\[[^\]]+\]/g) ?? []) found.push(m)
  return found
}

