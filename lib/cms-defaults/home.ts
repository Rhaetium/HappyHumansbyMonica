// Textes par défaut de la page « Accueil » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (app/cms-admin/page.tsx).

export const HOME_DEFAULTS: Record<string, string> = {
  hero_image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&auto=format&fit=crop',
  // Hero
  hero_badge:           'Monica Schneider · Executive Coach · Happy Humans',
  hero_title:           'Clarté, confiance et relations qui vous ressemblent',
  hero_subtitle:        'Executive Coach certifiée AoEC · EMCC Practitioner · Philosophical Counselling',
  hero_cta_primary:     'Séance découverte gratuite',
  hero_cta_contact:     'Me contacter',
  // Services
  services_badge:       'Accompagnement',
  services_title:       'Comment puis-je vous aider ?',
  services_b2c_title:  'Pour les particuliers',
  services_b2c_text:    'Managers, dirigeants, entrepreneurs ou personnes en transition qui veulent retrouver de la clarté, de la confiance et une direction qui leur ressemble vraiment.',
  services_b2c_cta:    'Réserver une séance découverte →',
  services_b2b_title:  'Pour les entreprises',
  services_b2b_text:    "Coaching de leadership, ateliers, séminaires et accompagnement du changement pour remettre de l'alignement et de l'élan dans les équipes.",
  services_b2b_cta:     "Discuter d'un projet →",
  // Cards section
  cards_section_badge:  'Aller plus loin',
  cards_section_title: 'Explorez les thématiques',
  cards_link_label:    'Découvrir →',
  // Booking
  booking_badge:        'Agenda',
  booking_widget_title: 'Choisissez votre créneau',
  booking_widget_subtitle: 'Séance découverte offerte (1h) ou programme de coaching.',
  // Contact
  contact_section_badge: 'Contact',
  contact_section_title: 'Une question ? Écrivez-moi',
  contact_section_subtitle: 'Réponse sous 48h.',
  form_success_title:  'Message envoyé !',
  form_success_body:   'Monica vous répondra sous 48h à {email}.',
  form_sending:        'Envoi en cours…',
  form_submit:         'Envoyer le message',
  // Card order (Explorez les thématiques)
  home_card_order_1:   'coaching',
  home_card_order_2:   'organisations',
  home_card_order_3:   'happiness-design',
  home_card_order_4:   'relations',
  // Misc
  booking_modal_title: 'Choisissez votre créneau',
  booking_modal_subtitle: 'Séance découverte offerte · 1h · Sans engagement',
  // Affichés à la place des boutons de réservation quand le compte Calendly n'a aucun rendez-vous public
  t_aucune_disponibilite_titre: "Aucune disponibilité pour le moment",
  t_aucune_disponibilite_texte: "L'agenda n'est pas ouvert pour l'instant. Écrivez-moi : je vous proposerai une séance dès que possible.",
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_bureau_elegant_avec_lumiere: "Bureau élégant avec lumière naturelle, ambiance coaching professionnel",
  t_seance_decouverte: "Séance découverte",
  t_gratuite_1h_sans_engagement: "gratuite · 1h · sans engagement",
  t_reserver_maintenant: "Réserver maintenant",
  t_confidentiel: "Confidentiel",
  t_sans_engagement: "Sans engagement",
  t_reponse_48h: "Réponse 48h",
  t_nom: "Nom *",
  t_votre_nom: "Votre nom",
  t_email: "Email *",
  t_votre_email_com: "votre@email.com",
  t_message: "Message *",
  t_votre_question_ou_demande: "Votre question ou demande…",
  t_reserver_via_calendly: "Réserver via Calendly →",
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: '',
  // ── Textes ajoutés pour le CMS (étaient en dur dans le code) ──
  contact_email_label: "Ou directement par email :",
  // ── Cartes « Explorez les thématiques » (étaient en dur dans la page) ──
  home_card_coaching_title: "Coaching individuel",
  home_card_coaching_desc: "Clarté, confiance et direction — un accompagnement sur mesure pour managers, dirigeants et personnes en transition.",
  home_card_organisations_title: "Pour les entreprises",
  home_card_organisations_desc: "Coaching de dirigeants, ateliers de cohésion et accompagnement du changement pour remettre de l'alignement.",
  home_card_hd_title: "Happiness Design",
  home_card_hd_desc: "12 séances pour reprendre les rênes de votre bonheur — au boulot et ailleurs. Un programme multidisciplinaire unique.",
  home_card_relations_title: "Relations & Attachement",
  home_card_relations_desc: "Comprenez votre style d'attachement et transformez durablement vos relations — personnelles et professionnelles.",
}
