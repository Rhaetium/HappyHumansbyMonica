// FAQ affichée par défaut en bas des pages de prestation (bloc « Questions fréquentes » des blocs personnalisés).
//
// Chaque réponse reprend UNIQUEMENT ce que la page ou la FAQ du site disent déjà (aucun tarif, chiffre ni promesse inventé).
// Elles servent à deux choses : répondre aux questions que les visiteurs et les assistants IA se posent, et déclarer ces
// questions à Google (FAQPage) à partir d'un contenu réellement visible sur la page.
// Monica les modifie, les complète ou les supprime dans l'admin : Pages → page → Blocs personnalisés.
import type { CustomBlock } from '@/lib/custom-sections'

type Faq = { q: string; a: string }

const block = (id: string, items: Faq[]): CustomBlock => ({ id, type: 'faq', badge: 'FAQ', title: 'Questions fréquentes', items })

export const PAGE_FAQS: Record<string, Faq[]> = {
  coaching: [
    {
      q: 'Combien coûte une séance de coaching ?',
      a: "La séance découverte, un premier échange pour clarifier votre situation et voir si le coaching vous convient, est gratuite. Une séance individuelle ponctuelle coûte 120 €. Le Programme Prise de Poste et le Programme Happiness Design sont sur devis.",
    },
    {
      q: 'Combien de séances faut-il en général ?',
      a: "Cela dépend de votre situation. Certaines personnes trouvent une clarté significative en 3 séances. Un accompagnement en profondeur dure souvent 3 à 6 mois, avec une séance toutes les 2 à 3 semaines. On ajuste ensemble.",
    },
    {
      q: 'Comment se déroulent les séances ?',
      a: "En visioconférence (Zoom ou Meet) ou en présentiel, selon les disponibilités. Chaque séance dure 45 à 60 minutes. L'essentiel du travail se fait dans l'échange : questions, silences, prises de conscience.",
    },
  ],
  entreprises: [
    {
      q: 'Combien coûte un accompagnement pour une entreprise ?',
      a: "Chaque engagement est construit sur mesure : le coaching de dirigeant, le programme équipe, la conférence et la formation sont sur devis, établi après un premier échange.",
    },
    {
      q: 'Qu’est-ce que le Coaching Flash prise de poste ?',
      a: "Un programme intensif de 5 séances de 60 minutes, à raison d'une séance toutes les deux semaines, pour les 90 premiers jours d'un nouveau poste : asseoir sa légitimité, définir ses priorités et transformer le syndrome de l'imposteur en carburant. Un suivi Notion est inclus entre les séances. Tarif sur devis.",
    },
    {
      q: 'Que comprend un programme pour une équipe ?',
      a: "Un diagnostic d'équipe, des ateliers sur mesure, du coaching de groupe et un suivi après le programme.",
    },
  ],
  relations: [
    {
      q: 'Qu’est-ce qu’un style d’attachement ?',
      a: "C'est la façon dont nous entrons en relation à l'âge adulte, un modèle construit dès la petite enfance. Il en existe quatre : sécure, anxieux, évitant et désorganisé.",
    },
    {
      q: 'Peut-on changer de style d’attachement ?',
      a: "Oui, ce n'est pas une fatalité : grâce à la neuroplasticité du cerveau, il est possible de le transformer. Trois leviers : la conscience de soi (observer ses réactions sans se juger), les relations correctrices (s'entourer de personnes sécures et fiables) et la thérapie centrée sur les émotions.",
    },
    {
      q: 'Le coaching sur les relations peut-il aider aussi au travail ?',
      a: "Oui. Les styles d'attachement influencent directement la façon dont on manage, dont on collabore, dont on réagit au stress ou aux conflits. Comprendre ses schémas relationnels est l'une des clés du leadership.",
    },
  ],
  'sparring-partner': [
    {
      q: 'À quoi sert un sparring partner ?',
      a: "À disposer d'un regard externe sur vos décisions stratégiques, votre positionnement et votre communication de dirigeant, par une pair qui connaît vos enjeux.",
    },
    {
      q: 'Dans quelles situations faire appel à un sparring partner ?',
      a: "Pour préparer un pitch ou une présentation, challenger une stratégie marketing, naviguer une transition de poste, ou communiquer en environnement multiculturel.",
    },
    {
      q: 'Pour qui ?',
      a: "Pour les dirigeants et les marketers. Monica, ex-L'Oréal et LVMH, offre le recul d'une pair qui connaît ces enjeux.",
    },
  ],
  'happiness-design': [
    {
      q: 'Qu’est-ce que Happiness Design ?',
      a: "Un programme de 12 séances pour reprendre les rênes de sa vie et de son bonheur, au travail et ailleurs. Il mêle neurosciences, psychologie positive, psychologie classique, méditation, pratique philosophique et design thinking.",
    },
    {
      q: 'À qui s’adresse-t-il ?',
      a: "À celles et ceux qui traversent une transition (prise de poste, reconversion, promotion, départ, retraite, parentalité, séparation), qui ont perdu le fil, ou qui veulent reprendre activement en main leur bonheur, leurs relations et leur impact.",
    },
    {
      q: 'Comment se déroule le programme ?',
      a: "12 séances d'une heure en individuel, puis 4 sessions de suivi pour ancrer durablement les changements, avec des outils et des exercices entre les séances. En ligne ou en présentiel (Paris). Tarif sur devis.",
    },
  ],
}

/** Valeur du champ `custom_sections` d'une page : un bloc FAQ, ou '' si la page n'en a pas. */
export function defaultFaqSections(page: string): string {
  const items = PAGE_FAQS[page]
  return items ? JSON.stringify([block(`faq-${page}`, items)]) : ''
}
