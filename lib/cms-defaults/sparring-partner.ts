// Textes par défaut de la page « Sparring Partner » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (app/cms-admin/page.tsx).

export const SPARRING_PARTNER_DEFAULTS: Record<string, string> = {
  hero_image: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1600&q=80&auto=format&fit=crop',
  hero_badge:         'Sparring Partner',
  hero_title:         "Un regard extérieur stratégique par une pair qui comprend vos enjeux",
  hero_desc:          "Ex-L'Oreal, ex-LVMH, 5 langues, philo-coaching. Monica vous offre le recul qu'un manager ne peut pas toujours trouver en interne.",
  hero_cta_primary:   'Réserver une session',
  hero_cta_secondary: 'Poser une question',
  section_badge:      "Pour quoi faire ?",
  section_title:      'Les situations qui appellent un sparring partner',
  use_case_1_title:  'Préparer un pitch',
  use_case_1_desc:   'Monica joue le contre-argument, affûte vos arguments et renforce votre posture.',
  use_case_2_title:  'Challenger une stratégie',
  use_case_2_desc:   "Un regard extérieur de quelqu'un qui connaît vos enjeux métier.",
  use_case_3_title:  'Prise de poste',
  use_case_3_desc:   'Nouvelle équipe, nouvelles attentes. Prendre de la hauteur rapidement.',
  use_case_4_title:  'Communication multiculturelle',
  use_case_4_desc:   '5 pays, 5 langues. Les codes implicites qui font ou défont une relation.',
  use_case_5_title:  'Décision difficile',
  use_case_5_desc:   'Partir ? Rester ? Négocier ? Un interlocuteur de confiance pour y voir clair.',
  why_section_badge: 'Pourquoi Monica ?',
  why_section_title: "Ex-L'Oreal, ex-LVMH, philo-coach et Happiness Design",
  experience_items:   "10 ans marketing — Henkel, LVMH, L'Oréal\nExecutive Coach certifiée AoEC & EMCC\nMaster en Philosophical Counselling\n5 langues : FR, EN, RO, DE, ES\nMéthode Happiness Design\n5 pays, 12 villes",
  cta_title:          'Prêt à challenger vos idées ?',
  cta_desc:           'Session 60 à 90 min. Conversation découverte de 30 min offerte.',
  cta_primary:       'Réserver une session',
  cta_secondary:     'Poser une question',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_discussion_strategique: "Discussion stratégique",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Sparring Partner pour dirigeants",
  seo_description: "Monica Schneider, sparring partner stratégique pour dirigeants et marketers. Challenger vos idées, préparer vos pitchs, traverser vos transitions.",
  seo_image: '',
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: '',
  // ── Liste modifiable (admin → Sparring Partner) : JSON [{…}] ; vide = anciens champs numérotés ──
  sparring_use_cases: '',
}
