import { defaultFaqSections } from './page-faqs'
// Textes par défaut de la page « Happiness Design » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

export const HAPPINESS_DESIGN_DEFAULTS: Record<string, string> = {
  hero_image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1600&q=80&auto=format&fit=crop',
  // Hero
  hero_badge:    'Programme',
  page_title:    'Happiness Design (V1/V2)',
  page_subtitle: '12 séances pour reprendre les rênes de votre vie et de votre bonheur — au boulot et ailleurs.',
  intro_text:    "Neurosciences, psychologie positive, philosophie pratique, design thinking — toutes les disciplines au service d'une transformation durable, pour que vous repreniez pleinement les rênes de votre vie.",
  hero_cta:      'Séance découverte gratuite (1h)',
  // Pour qui section
  pourqui_badge:   'Pour qui',
  pourqui_title:   'Ce programme est fait pour vous si…',
  pourqui_1_title: 'Vous traversez une transition',
  pourqui_1_desc:  "Prise de poste, reconversion, promotion, départ, retraite, parentalité, séparation. Un nouveau chapitre s'ouvre — vous voulez l'aborder avec clarté.",
  pourqui_2_title: 'Vous avez perdu le fil',
  pourqui_2_desc:  "Le boulot tourne, mais quelque chose sonne creux. Vous fonctionnez, mais vous n'habitez plus vraiment votre vie.",
  pourqui_3_title: 'Vous voulez reprendre les rênes',
  pourqui_3_desc:  "Pas juste 'aller mieux' — reprendre activement en main votre bonheur, vos relations, votre impact. Avec des outils concrets, pas du développement personnel vague.",
  // Ordre des sections centrales (modifiable dans le CMS)
  // Program section
  program_badge:       'Le programme',
  program_title:       '12 séances + 4 follow-ups',
  program_followups_note: '+ 4 sessions de suivi incluses pour ancrer durablement les changements.', step_01_title: 'Comment ça marche',       step_01_desc: 'Neurosciences + gratitude', step_02_title: 'Audit de sa vie',         step_02_desc: 'Life Design / Bonheur', step_03_title: 'Audit du boulot',         step_03_desc: 'Design Thinking appliqué à votre vie professionnelle', step_04_title: 'Audit des forces',       step_04_desc: 'Identifier vos ressources et atouts profonds', step_05_title: 'Forces pratiquées',       step_05_desc: "Via Character Strengths — lesquelles activez-vous vraiment ?", step_06_title: "L'échec",                 step_06_desc: "Changer son rapport à l'échec — audit des freins", step_07_title: 'Audit des freins',       step_07_desc: "Syndrome de l'imposteur · Attachement (TA) · Peurs (fears)", step_08_title: 'Homo risibilis',          step_08_desc: "Imparfait mais impactant — l'action salvatrice", step_09_title: 'V1 / V2',                step_09_desc: 'Qui je suis, qui je veux devenir', step_10_title: 'Les 3 métamorphoses',    step_10_desc: 'Les trois transformations clés de votre parcours', step_11_title: "Child's Plan",            step_11_desc: 'Jalons avec rappels pour ancrer les engagements', step_12_title: 'Follow-ups × 4',         step_12_desc: '4 sessions de suivi pour consolider et ancrer le changement',
  // Boîte à outils
  tools_badge:       'Programme',
  tools_title:       'Une boîte à outils multidisciplinaire',
  tools_intro_1:     "Ce n'est pas le bonheur qui fait la différence, mais comment on réagit dans l'adversité. Et une seule discipline ne suffit pas.",
  tools_intro_2:     "Happiness Design mêle neurosciences, psychologie positive, psychologie classique, méditation, pratique philosophique et design thinking — pour coller au plus près de votre chemin unique.",
  tools_origin_label:'L\'origine',
  tools_origin_text: "Cette méthode est née d'un mémoire de Master de Pratique Philosophique sur le bonheur, et de 6 ans d'expérimentation personnelle par Monica Schneider.",
  tools_conclusions_label: "Deux conclusions fondatrices :",
  tools_conclusion_1: "Ce n'est pas le bonheur qui fait la différence, c'est comment on réagit dans l'adversité.",
  tools_conclusion_2: "Une seule discipline ne suffit pas. Il faut comprendre son cerveau, savoir créer son bonheur, repérer quand l'inconscient reprend le dessus, entraîner son cerveau à réduire le cortisol et challenger ses pensées.",
  tools_claim:       "Happy Humans est la seule pratique de coaching en France qui intègre ces 6 disciplines dans un programme cohérent.",
  // Les 7 outils illustrés (textes fidèles aux slides de la conférence)
  outil_label:       'Outil',
  outil_1_title:     'Comprendre : ne croyez pas tout ce que vous pensez',
  outil_1_desc:      'Sortir du pilote automatique, reprendre la main.',
  outil_1_alt:       'Cerveau-cactus : nos pensées ne sont que des alertes de survie',
  outil_2_title:     'Recalibrer son cerveau pour l\u2019optimisme',
  outil_2_desc:      'La liste des 3 choses positives, 21 jours pour créer l\u2019habitude.',
  outil_2_alt:       'Cerveau-cactus en fleurs : recalibrer son cerveau vers l\u2019optimisme',
  outil_3_title:     'Adversité : le cadeau caché qui nous révèle',
  outil_3_desc:      'Quel est le cadeau là-dedans ? Voir des opportunités.',
  outil_3_alt:       'Cadeau-cactus : l\u2019adversité comme cadeau caché',
  outil_4_title:     'La liberté est beaucoup plus proche qu\u2019on ne le pense',
  outil_4_desc:      'Moins impacté par les conflits et les inconvénients.',
  outil_4_alt:       'Fleur de cactus : la liberté dans l\u2019espace de nos réactions',
  outil_5_title:     'Je suis Homo Risibilis',
  outil_5_desc:      'Ne pas se prendre tant au sérieux : plus de légèreté, moins de charge mentale.',
  outil_5_alt:       'Penseur-cactus : habiter les contradictions avec humour',
  outil_6_title:     'Cultiver l\u2019action',
  outil_6_desc:      'Vivre avec sens et impact.',
  outil_6_alt:       'Bras-cactus : l\u2019action qui crée du sens',
  outil_7_title:     'V1 / V2 : à nous de choisir notre version',
  outil_7_desc:      'Passer du pilote automatique (anxiété, doute) au filtre des outils (confiance, fierté).',
  outil_7_alt:       'V1 cactus épineux face à V2 cactus en fleurs',
  // Pricing section
  pricing_badge:           'Investissement',
  pricing_title:           'Un programme sur mesure',
  format_label:            'Format',
  format_value:            '12 séances + 4 follow-ups',
  duration_label:          'Durée',
  duration_value:          '60 min',
  rhythm_label:            'Rythme',
  rhythm_value:            '1 séance / 2 semaines',
  price_label:             'Tarif',
  price_value:             'Sur devis',
  cta_label:               'Demander un devis →',
  program_complete_features: "12 séances d'1h en individuel\n4 sessions de suivi post-programme\nOutils et exercices entre les séances\nEn ligne ou en présentiel (Paris)",
  discovery_label:         'Séance découverte',
  discovery_price:         'Offerte',
  discovery_unit:          '1h · Sans engagement',
  discovery_features:      "Échange sur votre situation\nPrésentation du programme\nQuestions / réponses\nDécision libre à l'issue",
  discovery_cta:           'Réserver maintenant →',
  // CTA
  cta_title:    "Prêt·e à reprendre les rênes ?",
  cta_subtitle: "Commençons par une séance découverte d'1h — gratuite et sans engagement.",
  cta_button:   'Réserver ma séance découverte →',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_lumiere_doree_symbolisant_la: "Lumière dorée symbolisant la transformation et le bonheur",
  t_par_happy_humans: "— par Happy Humans",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Happiness Design — Programme 12 séances",
  seo_description: "Happiness Design : 12 séances alliant neurosciences, philosophie pratique, psychologie positive et design thinking pour reprendre les rênes de votre vie.",
  seo_image: '',
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: defaultFaqSections('happiness-design'),
}
