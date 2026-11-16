// Textes par défaut de la page « Entreprises » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).
// Les champs « liste » (…_features, …_items) : un élément par ligne.

export const ENTREPRISES_DEFAULTS: Record<string, string> = {
  // Hero
  hero_image:    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80',
  hero_badge:    'Entreprises',
  page_title:    "Remettre de l'alignement et de l'élan dans vos équipes.",
  intro_text:    "Coaching de dirigeants, ateliers de cohésion, accompagnement du changement et séminaires sur mesure.",
  // Section « Ce que je propose »
  section_image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&auto=format&fit=crop',
  offres_badge:  'Offres',
  section_title: 'Ce que je propose',
  section_text:  "Quand une équipe perd de sa cohérence, les résultats s'en ressentent toujours.\n\nAvec 10 ans passés à développer des marques internationales pour Henkel, LVMH et L'Oréal — en Allemagne, France, Royaume-Uni et Europe de l'Est — j'ai vécu de l'intérieur les dynamiques de transformation d'équipe, de prise de poste et de communication interculturelle.\n\nAujourd'hui j'apporte cette expérience dans ma pratique de coaching. Je travaille avec les dirigeants et les entreprises pour remettre de l'alignement — entre les personnes, entre les objectifs et les moyens, entre ce qu'on dit et ce qu'on fait — ou tout simplement pour rebooster l'engagement et l'élan commun.",
  offres_cta:    'Discuter de votre projet →',
  // Domaines d'intervention
  domains_badge:    'Expertise',
  domains_title:    "Domaines d'intervention",
  domains_subtitle: 'Une approche ancrée dans la réalité du terrain',
  domain_1_title: 'Coaching de dirigeants',
  domain_1_desc:  "Accompagnement individuel sur 3 à 6 mois. Prise de poste, leadership, transitions, gestion de l'ambiguïté.",
  domain_2_title: 'Communication interculturelle',
  domain_2_desc:  "Décoder les différences de communication au sein d'équipes multiculturelles. Issu de 10 ans d'expérience internationale.",
  domain_3_title: 'Communication interne',
  domain_3_desc:  "Construire une communication interne qui engage vraiment. Du sens, pas du bruit. Pour rebooster l'adhésion des équipes.",
  domain_4_title: 'Sparring partner',
  domain_4_desc:  "Un regard externe sur vos décisions stratégiques, votre positionnement et votre communication de dirigeant.",
  domain_5_title: "Cohésion d'équipe",
  domain_5_desc:  "Ateliers et séminaires sur mesure. Diagnostic d'équipe, identification des blocages, plan de transformation.",
  domain_6_title: 'Happiness Design en entreprise',
  domain_6_desc:  "Remettre du sens et de l'engagement au travail. Programme basé sur les neurosciences, la psychologie positive et la philosophie pratique.",
  // Coaching Flash — prise de poste
  flash_badge:    'Programme phare',
  flash_title:    'Coaching Flash\nPrise de poste',
  flash_desc:     "Vous venez de prendre un nouveau poste — ou vous êtes sur le point de le faire. Les 90 premiers jours sont décisifs. Ce programme intensif de 5 séances vous aide à asseoir votre légitimité, définir vos priorités et transformer le syndrome de l'imposteur en carburant.",
  flash_features: "Clarifier votre vision et vos objectifs 90 jours\nIdentifier vos alliés et cartographier les dynamiques\nConstruire votre posture de leadership\nGérer la pression et les attentes sans perdre pied\nSuivi Notion inclus entre les séances",
  flash_format:   '5 séances · 60 min',
  flash_rythme:   '1 séance / 2 semaines',
  flash_tarif:    'Sur devis',
  flash_cta_link: 'En savoir plus ou demander un devis →',
  // Sparring partner
  sparring_badge:    'Sparring Partner — pour les marketers',
  sparring_title:    'Un regard extérieur stratégique',
  sparring_desc:     "Vous êtes marketer·euse et vous avez besoin d'un interlocuteur de confiance pour tester vos idées, challenger votre stratégie ou vous préparer à une prise de parole importante. Monica, ex-L'Oréal / LVMH, vous offre le recul d'une pair qui connaît vos enjeux.",
  sparring_features: "Préparer un pitch ou une présentation\nChallenger une stratégie marketing\nNaviguer une transition de poste\nCommunication en environnement multiculturel",
  sparring_cta_link: 'En savoir plus →',
  // Bandeau contact
  cta_title:  'Un projet ? Une question ?',
  cta_button: 'Prendre contact',
  // Tarification
  pricing_badge:    'Investissement',
  pricing_title:    'Des formules adaptées à votre entreprise',
  pricing_subtitle: "Chaque engagement est construit sur mesure. Les fourchettes ci-dessous vous donnent un point de repère ; un devis précis est établi après échange.",
  pricing_card_1_title: 'Coaching dirigeant',
  pricing_card_1_price: 'Sur devis',
  pricing_card_1_unit:  '',
  pricing_card_1_desc:  'Accompagnement individuel de dirigeants, managers et hauts potentiels. Programme sur 3 à 6 mois.',
  pricing_card_1_items: "Bilan de départ et objectifs\nSéances bimensuelles 90 min\nDisponibilité inter-séances\nRapport de progression",
  pricing_card_1_cta:   'Demander un devis',
  pricing_card_2_title: 'Programme équipe',
  pricing_card_2_price: 'Sur devis',
  pricing_card_2_unit:  '',
  pricing_card_2_desc:  'Ateliers collectifs, séminaires de cohésion et accompagnement du changement pour vos équipes.',
  pricing_card_2_items: "Diagnostic d'équipe\nAteliers sur mesure\nCoaching de groupe\nSuivi post-programme",
  pricing_card_2_cta:   'Discutons-en',
  pricing_card_3_title: 'Conférence & formation',
  pricing_card_3_price: 'Sur devis',
  pricing_card_3_unit:  '',
  pricing_card_3_desc:  'Conférence atelier « 7 outils pour sourire dans le chaos » qui booste la collaboration, l’innovation et l’engagement des équipes.',
  pricing_card_3_items: "Format keynote ou atelier\nContenu personnalisé\nSupport de présentation\nSession Q&R incluse",
  pricing_card_3_cta:   'Voir les thèmes',
  // Différenciation
  diff_badge:    'Différenciation',
  diff_title:    'Pourquoi une coach avec 10 ans en marketing international ?',
  diff_text:     "La plupart des coachs connaissent les outils. Monica connaît aussi la pression d'un lancement produit chez L'Oréal, le management d'équipes à Berlin, Paris et Londres, et les enjeux de communication dans des organisations matricielles complexes.\n\nCe n'est pas un avantage anecdotique. C'est ce qui lui permet de comprendre vos enjeux sans que vous ayez à les expliquer — et de proposer des solutions qui collent à la réalité du terrain.",
  diff_cta_link: 'Discuter de votre projet →',
  // Témoignage
  temoignage_dorothee_text:   "On a eu un super feedback sur la réunion de présentation que nous avons préparée ensemble. Jérôme (le n+1 de ma cliente) nous a dit : \"Champagne !\"",
  temoignage_dorothee_author: 'Dorothée*',
  temoignage_dorothee_role:   'Directrice Achats Beauty Retail',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_entreprises: "Entreprises",
  t_reunion_d_equipe_et: "Réunion d'équipe et leadership en entreprise",
  t_format: "Format",
  t_rythme: "Rythme",
  t_tarif: "Tarif",
  t_prenom_modifie: "* Prénom modifié",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Coaching entreprises & leadership",
  seo_description: "Coaching de dirigeants, prise de poste, ateliers de cohésion et séminaires sur mesure pour remettre de l'alignement dans vos équipes.",
  seo_image: '',
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: '',
  // ── Listes modifiables (admin → Entreprises) : JSON [{…}] ; vide = anciens champs numérotés ──
  entreprises_domains: '',
  entreprises_pricing: '',
};
