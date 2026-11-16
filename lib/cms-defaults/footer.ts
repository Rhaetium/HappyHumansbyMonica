// Textes par défaut de la page « Pied de page » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

export const FOOTER_DEFAULTS: Record<string, string> = {
  site_name:              'Happy Humans',
  tagline:                'philo-coaching',
  description:            'Coaching & transformation avec Monica Schneider.',
  description_2:          'Une pratique qui relie leadership, authenticité, philosophie et transformation humaine.',
  linkedin_url:           'https://fr.linkedin.com/in/monica-schneider-philo-coaching',
  photos_label:           'Photos : ',
  footer_nav_title:       'Navigation',
  footer_nav_home:        'Accueil',
  footer_nav_coaching:    'Coaching individuel',
  footer_nav_hd:          "Happiness Design (V1/V2)",
  footer_nav_sparring:    'Sparring Partner',
  footer_nav_entreprises: 'Entreprises',
  footer_nav_relations:   'Relations',
  footer_nav_contact:     'Contact',
  footer_nav_blog:        'Ressources',
  footer_nav_faq:         'FAQ',
  footer_services_title:  'Services',
  service_1:              'Executive coaching individuel',
  service_2:              'Coaching de dirigeants',
  service_3:              'Philosophical counselling',
  service_4:              'Sparring partner',
  service_5:              'Ateliers et séminaires',
  copyright:              'Happy Humans \u2014 Monica Schneider. Tous droits réservés.',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_linkedin: "LinkedIn →",
  t_unsplash: "Unsplash",
  t_mentions_legales: "Mentions légales",
  t_confidentialite: "Confidentialité",
}
