// Textes par défaut de la page « Réservation » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (app/cms-admin/page.tsx).

export const BOOKING_DEFAULTS: Record<string, string> = {
  hero_badge:         'Réservation',
  hero_title:         'Réserver une séance',
  hero_subtitle:      'Séance découverte offerte · 1h · Sans engagement',
  reassurance_1_title: 'Séance découverte gratuite',
  reassurance_1_desc:  '1h sans engagement pour vous présenter et voir si le coaching vous correspond.',
  reassurance_2_title: 'Confirmation immédiate',
  reassurance_2_desc:  'La réservation est confirmée instantanément dans votre agenda Google ou Outlook.',
  reassurance_3_title: 'Annulation libre',
  reassurance_3_desc:  "Vous pouvez reporter ou annuler jusqu'à 24h avant la séance, sans frais.",
  footer_note:         'Toutes les séances se déroulent en ligne (Google Meet) ou en présentiel à Paris, selon votre préférence.',
  email_booking_text:  'Écrire à Monica →',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_chargement_du_calendrier: "Chargement du calendrier…",
  t_ouvrir_calendly_directement: "Ouvrir Calendly directement →",
  t_vous_preferez_reserver_par: "Vous préférez réserver par email ?",
  // Affichés à la place de l'agenda quand le compte Calendly n'a aucun rendez-vous public
  t_aucune_disponibilite_titre: "Aucune disponibilité pour le moment",
  t_aucune_disponibilite_texte: "L'agenda n'est pas ouvert pour l'instant. Écrivez-moi : je vous proposerai une séance dès que possible.",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Réserver une séance — Monica Schneider",
  seo_description: "Réservez une séance découverte gratuite (1h) avec Monica Schneider. Executive coaching, philosophical counselling et Happiness Design.",
  seo_image: '',
  // ── Textes ajoutés pour le CMS (étaient en dur dans le code) ──
  display_problem: "Problème d'affichage ?",
  // Pastille affichée au-dessus de l'agenda quand le visiteur arrive avec ?from=<service>
  service_label_coaching: 'Coaching individuel',
  service_label_happiness_design: 'Programme Happiness Design',
  service_label_sparring_partner: 'Sparring Partner',
  service_label_entreprises: 'Coaching entreprises',
  service_label_relations: 'Coaching Relations',
}
