// Textes de l'interface publique des questionnaires (/q/<slug>) — SOURCE UNIQUE.
// Les titres, descriptions et questions viennent de la base ; ces libellés d'interface sont communs à tous.
// Lus uniquement par app/q/[slug]. Ne les dupliquez pas dans un composant.
export const QUESTIONNAIRE_DEFAULTS = {
  loading: 'Chargement du questionnaire…',
  not_found_title: 'Questionnaire introuvable',
  not_found_text: "Ce questionnaire n'existe pas ou n'est plus disponible.",
  required_note: 'Les questions marquées d’un astérisque sont obligatoires.',
  required_mark: '*',
  scale_low_default: 'Pas du tout',
  scale_high_default: 'Tout à fait',
  text_placeholder: 'Votre réponse…',
  name_label: 'Votre prénom ou nom (facultatif)',
  email_label: 'Votre e-mail (facultatif)',
  submit: 'Envoyer mes réponses',
  submitting: 'Envoi en cours…',
  success_title: 'Merci !',
  success_text: 'Vos réponses ont bien été envoyées.',
  error_generic: 'Une erreur est survenue. Réessayez.',
  error_network: 'Connexion impossible. Réessayez dans quelques instants.',
  error_invalid: 'Merci de corriger les points signalés.',
  scale_group_label: 'Choisissez une valeur',
} as const

export type QuestionnaireUiKey = keyof typeof QUESTIONNAIRE_DEFAULTS
