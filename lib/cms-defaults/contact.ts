// Textes par défaut de la page « Contact » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

export const CONTACT_DEFAULTS: Record<string, string> = {
  hero_badge:           'Contact',
  hero_image:           'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80&auto=format&fit=crop',
  page_title:           'Parlons de ce qui vous amène.',
  intro_text:           "Que vous soyez en plein questionnement, en transition ou simplement curieux·se de voir si le dialogue peut aider — je vous invite à me contacter. Je réponds personnellement à chaque message.",
  photo:                '/monica-schneider.jpg',
  form_name_label:      'Votre nom',
  form_email_label:     'Votre email',
  form_subject_label:   'Sujet (optionnel)',
  form_message_label:   'Votre message',
  form_submit_label:    'Envoyer →',
  success_title:        'Message envoyé !',
  success_text:         'Monica vous répondra sous 48h.',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_espace_d_echange_calme: "Espace d'échange calme et chaleureux",
  t_votre_nom: "Votre nom",
  t_votre_email_com: "votre@email.com",
  t_type_de_demande: "Type de demande",
  t_selectionnez: "Sélectionnez...",
  t_coaching_individuel: "Coaching individuel",
  t_coaching_accompagnement_entreprise: "Coaching & accompagnement entreprises",
  t_accompagnement_relations: "Accompagnement Relations",
  t_conference_formation: "Conférence / Formation",
  t_autre_question: "Autre question",
  t_objet_de_votre_message: "Objet de votre message",
  t_decrivez_votre_situation_ou: "Décrivez votre situation ou votre question…",
  t_monica_schneider: "Monica Schneider",
  t_ms: "MS",
  t_monica_schneider_2: "Monica Schneider",
  t_executive_coach_philosophical_coun: "Executive Coach · Philosophical Counselling",
  t_francais_anglais_et_roumain: "Français, anglais et roumain",
  t_reponse_sous_48h: "Réponse sous 48h",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Contact — Monica Schneider",
  seo_description: "Écrivez à Monica Schneider, executive coach et philo-coach. Réponse personnelle sous 48h : coaching, entreprises, Happiness Design, sparring partner.",
  seo_image: '',
}
