import { defaultFaqSections } from './page-faqs'
// Textes par défaut de la page « Coaching » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

const DEFAULTS = {
  hero_image:         '/images/marque/hero-coaching.webp',
  hero_badge:         'Coaching',
  hero_title:         "Il y a des moments où il faut réapprendre à habiter son rôle.",
  hero_subtitle:      "Executive Coach certifiée AoEC · EMCC Practitioner · Monica Schneider accompagne des managers, dirigeants et personnes en transition qui veulent retrouver clarté, confiance et une direction qui leur ressemble vraiment.",
  hero_cta_primary:   'Séance découverte gratuite (1h)',
  hero_cta_primary_href: '/booking?from=coaching',
  hero_cta_contact:   'Me contacter',
  hero_cta_contact_href: '/contact',
  coaching_b2c_image: '/images/conference/outil-4-liberte-fleur.webp',
  coaching_b2c_badge: 'Individuel',
  coaching_b2c_title: 'Coaching individuel',
  coaching_b2c_text: `Un espace pour ralentir, regarder ce qui se passe vraiment — et construire un mouvement qui tient dans la durée.\n\nLe coaching que je propose n'est pas un conseil. C'est un accompagnement qui part de là où vous êtes vraiment.\n\nJe m'appuie sur des techniques classiques d'executive coaching (modèles GROW, Gestalt, Solutions Focused, Co-active…) mais aussi sur des outils rencontrés plus rarement — méditation, philosophie, psychologie, design thinking) pour travailler aussi sur la transformation que vous devez accomplir au plus profond de vous pour réaliser vos objectifs.\n\nPour offrir du recul, de la clarté et de nouvelles perspectives.\n\nVous y voyez plus clair, y compris sur les prochaines actions à mettre en place.\n\nVous ressentez des moments de révélations, d'alignement profonds.\n\nVous vous retrouvez — et vous êtes prêt·e à accélérer avec un élan et une clarté revigorants.`,
  coaching_b2c_cta_link: 'Me contacter →',
  coaching_b2c_cta_link_href: '/contact',
  coaching_b2b_image: '/images/conference/boite-a-outils.webp',
  coaching_b2b_badge: 'Entreprises',
  coaching_b2b_title: 'Pour les entreprises',
  coaching_b2b_text:  "Coaching de dirigeants, ateliers de cohésion, accompagnement du changement et séminaires sur mesure.\n\nQuand une équipe perd de sa cohérence, les résultats s'en ressentent toujours. Je travaille avec les dirigeants et les entreprises pour remettre de l'alignement — entre les personnes, entre les objectifs et les moyens, entre ce qu'on dit et ce qu'on fait.",
  coaching_b2b_cta_link: 'Découvrir →',
  coaching_b2b_cta_link_href: '/entreprises',
  // Programs
  programs_badge:     'Tarifs',
  programs_title:     'Programmes & investissement',
  // CTA tunnel
  tunnel_title:              'Prête à commencer ?',
  tunnel_cta_primary:        'Réserver maintenant →',
  tunnel_cta_primary_href: '/booking?from=coaching',
  tunnel_cta_secondary:       'Poser une question',
  tunnel_cta_secondary_href: '/contact',
  tunnel_reassurance:        'Séance découverte gratuite · 1h · Sans engagement · Confirmation immédiate',
  // CTA final
  cta_title:         'Prêt·e à commencer ?',
  form_cta_title:    "Commençons par une séance découverte de 1h — gratuite et sans engagement.",
  form_cta_button:   'Séance découverte gratuite (1h)',
  form_cta_button_href: '/booking?from=coaching',
}

const DEFAULTS_TEMOIGNAGES = {
  testimonial_section_title: "Ils témoignent",
  testimonial_section_desc:  "Des parcours différents, une même expérience : retrouver de la clarté et avancer avec confiance.",
  testimonial_1_quote:  "J'étais le bon élève typique : attendre d'avoir tout compris et tout structuré avant d'agir, ce qui me freinait clairement dans mon rôle. Grâce à mes échanges avec Monica, j'ai compris mes mécanismes limitants et découvert de nouvelles perspectives. Le déclic du \"cancre intelligent\" m'a permis de voir mes forces autrement : j'ose proposer, tester, décider plus vite. Résultat : plus d'impact, plus de visibilité, et des résultats business concrets.",
  testimonial_1_name:   "Thibault*",
  testimonial_1_role:   "Directeur marketing, secteur tech",
  testimonial_2_quote:  "I highly recommend the coaching sessions that Monica Schneider offers. My experience with her has been greatly satisfactory and has allowed me to achieve goals and mindsets that would have been very difficult to accomplish otherwise. She has a vast knowledge of the questioning technique and made every session worth and developmental. Monica's coaching style reflects her professionalism and her engaging nature that has allowed me to express myself openly. She provided a psychological safe environment.",
  testimonial_2_name:   "Maria*",
  testimonial_2_role:   "Learning & Development Director, Banking",
  testimonial_3_quote:  "On a eu un super feedback sur la réunion de présentation que nous avons préparée ensemble. Jérôme (le n+1 de ma cliente) nous a dit : \"Champagne !\"",
  testimonial_3_name:   "Dorothée*",
  testimonial_3_role:   "Directrice Achats Beauty Retail",
  testimonial_4_quote:  "I want to thank Monica for her inspiring, relieving, insightful and energizing sessions! She opened up valuable new perspectives on my current situation and helped me get to know myself better. Just in a few sessions I was able to view my situation from a completely new angle, and suddenly see the road to my new self.",
  testimonial_4_name:   "David*",
  testimonial_4_role:   "Governmental Think Tank",
  testimonial_note:     "* Prénom modifié",
}

const DEFAULTS_PROGRAMS = {
  program_1_label: 'Séance découverte',
  program_1_desc:  'Premier échange pour clarifier votre situation, vos attentes et voir si le coaching vous convient.',
  program_1_price: 'Gratuit',
  program_1_unit: '1h',
  program_1_cta:   'Réserver une séance découverte',
  program_2_label: 'Séance individuelle',
  program_2_desc:  'Séance ponctuelle pour travailler sur un sujet précis ou maintenir une dynamique engagée.',
  program_2_price: '120 €',
  program_2_unit: '60 min',
  program_2_cta:   'Réserver une séance',
  program_3_label: 'Programme Prise de Poste',
  program_3_subtitle: 'Les 90 premiers jours sont décisifs',
  program_3_desc:  '6 séances de coaching + 1 point hebdomadaire de 30 minutes toutes les semaines pendant les 90 premiers jours.',
  program_3_format: '6 séances · 60 min + points hebdo 30 min',
  program_3_price: 'Sur devis',
  program_3_cta:   'Réserver ce programme',
  program_4_label: 'Programme Happiness Design',
  program_4_subtitle: '12 séances pour reprendre les rênes de votre vie',
  program_4_desc:  'Un programme complet en 12 séances pour reprendre les rênes de votre vie et de votre bonheur au boulot et ailleurs.',
  program_4_format: '12 séances + 4 follow-ups',
  program_4_price: 'Sur devis',
  program_4_cta:   'En savoir plus',
}

export const COACHING_DEFAULTS: Record<string, string> = { ...DEFAULTS, ...DEFAULTS_TEMOIGNAGES, ...DEFAULTS_PROGRAMS,
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_bureau_elegant_ambiance_coaching: "Illustration : un cerveau en forme de cactus, pour comprendre comment on fonctionne",
  t_coaching_individuel_introspection_: "Illustration : un cactus qui fleurit, symbole de la liberté de se transformer",
  t_coaching_d_equipe_et: "Illustration : une boîte à outils dont les outils sont des cactus, pour les équipes et les dirigeants",
  // Affiché à la place du bouton d'une carte de programme dont le rendez-vous Calendly n'a rien de public
  t_aucune_disponibilite_titre: "Aucune disponibilité pour le moment",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Coaching individuel & philo-coaching",
  seo_description: "Monica Schneider, Executive Coach certifiée AoEC, accompagne managers et dirigeants en transition. Méthode Happiness Design. Séance découverte gratuite.",
  seo_image: '',
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: defaultFaqSections('coaching'),
  // ── Listes modifiables (admin → Coaching) : JSON [{…}] ; vide = anciens champs numérotés ──
  coaching_programs: '',
  coaching_testimonials: '',
}
