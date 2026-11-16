// Textes par défaut de l'espace client — SOURCE UNIQUE.
// Lus par /auth/login, /auth/register et /dashboard ET par l'admin du CMS (lib/cms-page-defaults.ts).
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).
//
// Ces pages sont volontairement tutoyées (« ton espace ») : c'est le ton d'origine, à conserver
// si vous réécrivez les textes.
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'

export const COMPTE_DEFAULTS: Record<string, string> = {
  // ── Commun ──
  compte_badge: 'Espace client',

  // ── Connexion (/auth/login) ──
  login_title: 'Connexion',
  login_subtitle: 'Accède à ton espace de suivi et à tes ressources de coaching.',
  login_not_configured: "Supabase n'est pas configuré en environnement courant.",
  login_error_unavailable: 'Connexion indisponible : variables Supabase manquantes.',
  login_email_label: 'Email',
  login_email_placeholder: 'ton.email@exemple.fr',
  login_password_label: 'Mot de passe',
  login_password_placeholder: '••••••••',
  login_submitting: 'Connexion en cours...',
  login_submit: 'Me connecter',
  login_no_account: 'Pas encore de compte ?',
  login_create_link: 'Créer un compte',

  // ── Inscription (/auth/register) ──
  register_title: 'Créer ton compte',
  register_subtitle: 'Crée ton compte pour accéder à ton espace de suivi et aux ressources de coaching.',
  register_error_unavailable: 'Inscription indisponible : variables Supabase manquantes.',
  register_error_short_password: 'Le mot de passe doit contenir au moins 8 caractères.',
  register_error_mismatch: 'Les mots de passe ne correspondent pas.',
  register_success: 'Compte créé. Vérifie ton email pour confirmer ton inscription.',
  register_password_placeholder: '8 caractères minimum',
  register_confirm_label: 'Confirmer le mot de passe',
  register_confirm_placeholder: 'Répète ton mot de passe',
  register_submitting: 'Création en cours...',
  register_submit: 'Créer mon compte',
  register_have_account: 'Déjà inscrit ?',
  register_login_link: 'Me connecter',

  // ── Espace client (/dashboard) ──
  dash_welcome: 'Bienvenue',
  dash_subtitle: 'Ton espace pour suivre ton accompagnement et accéder à tes ressources.',
  dash_signout: 'Déconnexion',
  dash_resources_title: 'Tes ressources',
  dash_test_title: "Test d'attachement",
  dash_test_text: "Découvre ton style d'attachement et reçois 3 actions personnalisées.",
  dash_test_cta: 'Faire le test →',
  dash_relations_title: 'Ressources Relations',
  dash_relations_text: 'Articles et outils pour des relations plus épanouissantes.',
  dash_relations_cta: 'Explorer →',
  dash_next_title: 'Continuer ton parcours',
  dash_next_text: 'Tu as des questions ou tu souhaites planifier ta prochaine session ? Monica est là pour t’accompagner.',
  dash_contact_cta: 'Contacter Monica',
  dash_coaching_cta: 'Découvrir le coaching',
  dash_help_text: 'Des questions sur ton accompagnement ?',
  dash_email: DEFAULT_CONTACT_EMAIL,
}
