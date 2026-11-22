// Textes par défaut de la page « FAQ » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

export const FAQ_DEFAULTS: Record<string, string> = {
  hero_image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=80&auto=format&fit=crop',
    page_title: "Ce qu'on nous demande souvent",
    page_subtitle: "Vous trouverez ici les réponses aux questions les plus fréquentes sur la séance découverte gratuite, le déroulé et la durée du coaching, le philo-coaching et la réservation. Une autre question ? Écrivez-nous directement.",
    cta_title: "Une autre question ?",
    cta_text: "Je réponds personnellement à chaque message sous 48h.",
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_espace_calme_pour_reflechir: "Espace calme pour réfléchir",
  t_faq: "FAQ",
  t_ecrire_a_monica: "Écrire à Monica →",
  t_ecrire_a_monica_href: '/contact',
  t_reserver_une_seance: "Réserver une séance",
  t_reserver_une_seance_href: '/booking',
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Questions fréquentes sur le coaching",
  seo_description: "Questions fréquentes sur le coaching avec Monica Schneider : séance découverte gratuite, déroulé, durée, philo-coaching et réservation.",
  seo_image: '',
  // ── Liste modifiable (admin → FAQ) : JSON [{ q, a }] ; vide = FAQ_ITEMS puis anciens champs numérotés ──
  faq_questions: '',
}

// Questions de la FAQ : 15 emplacements numérotés (les 8 premiers sont remplis).
// ⚠️ Volontairement SÉPARÉ de FAQ_DEFAULTS : ces textes ne sont PAS passés au hook, car un champ vidé dans
// l'admin retomberait sur sa valeur par défaut et la question réapparaîtrait. La page n'utilise ces valeurs
// que tant que le CMS n'a enregistré aucune question ; dès qu'il y en a, seules celles-ci s'affichent
// (une question dont le champ est vide est simplement masquée → on peut en supprimer et en ajouter).
export const FAQ_SLOTS = 15
export const FAQ_ITEMS: Record<string, string> = {
  faq_1_q: "C'est quoi exactement une séance découverte ?",
  faq_1_a: "C'est un premier échange gratuit d'1h, sans engagement. On parle de vous, de votre situation, de ce qui vous amène. C'est l'occasion de voir si le coaching vous correspond et si on a envie de travailler ensemble.",
  faq_2_q: "À qui s'adresse le coaching avec Monica ?",
  faq_2_a: "Aux managers, dirigeants, entrepreneurs et personnes en transition — professionnelle ou personnelle. À celles et ceux qui sentent qu'il y a quelque chose à clarifier, à aligner ou à transformer, mais qui ne savent pas encore exactement par où commencer.",
  faq_3_q: "En quoi le philo-coaching est différent d'une thérapie ?",
  faq_3_a: "La thérapie travaille souvent sur les blessures du passé. Le coaching philo s'intéresse à ce qui est vivant maintenant — vos valeurs, vos directions, vos tensions actuelles — et construit vers l'action. C'est une approche orientée présent et futur, pas de guérison au sens clinique.",
  faq_4_q: "Combien de séances faut-il en général ?",
  faq_4_a: "Ça dépend vraiment de votre situation. Certaines personnes trouvent une clarté significative en 3 séances. Un accompagnement en profondeur dure souvent 3 à 6 mois, avec une séance toutes les 2 à 3 semaines. On ajuste ensemble.",
  faq_5_q: "Comment se déroulent les séances ?",
  faq_5_a: "Elles se font en visioconférence (Zoom ou Meet) ou en présentiel selon la disponibilité. Chaque séance dure 45 à 60 minutes. Monica prend des notes, mais l'essentiel du travail se fait dans l'échange — questions, silences, prises de conscience.",
  faq_6_q: "Est-ce que le coaching sur les relations peut m'aider professionnellement aussi ?",
  faq_6_a: "Absolument. Les styles d'attachement influencent directement la façon dont on manage, dont on collabore, dont on réagit au stress ou aux conflits. Comprendre ses schémas relationnels est l'une des clés du leadership.",
  faq_7_q: "Comment réserver une séance ?",
  faq_7_a: "Directement sur la page /booking — vous choisissez un créneau qui vous convient, vous remplissez vos coordonnées, et Monica vous confirme sous 48h. La séance découverte est gratuite.",
  faq_8_q: "Puis-je annuler ou reporter une séance ?",
  faq_8_a: "Oui, jusqu'à 48h avant la séance. Au-delà, la séance est due sauf cas de force majeure. On fait confiance à la bonne foi des deux côtés.",
  faq_9_q: '',
  faq_9_a: '',
  faq_10_q: '',
  faq_10_a: '',
  faq_11_q: '',
  faq_11_a: '',
  faq_12_q: '',
  faq_12_a: '',
  faq_13_q: '',
  faq_13_a: '',
  faq_14_q: '',
  faq_14_a: '',
  faq_15_q: '',
  faq_15_a: '',
}
