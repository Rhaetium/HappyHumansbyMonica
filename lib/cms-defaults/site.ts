// Textes par défaut des éléments communs à tout le site (page « site » du CMS) — SOURCE UNIQUE.
// Bandeau cookies, formulaire newsletter, boutons de partage, page 404, page de maintenance.
// Lus par les composants ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'

export const SITE_DEFAULTS: Record<string, string> = {
  // ── Bandeau cookies ──
  cookie_title: "Cookies et vie privée",
  cookie_text: "Nous utilisons des cookies strictement nécessaires au fonctionnement du site. Les cookies de mesure d'audience et marketing ne sont activés qu'avec votre consentement.",
  cookie_details: "Détails :",
  cookie_privacy_link: "Politique de confidentialité",
  cookie_and: "et",
  cookie_legal_link: "Mentions légales",
  cookie_refuse: "Refuser",
  cookie_accept: "Accepter",
  // ── Newsletter ──
  newsletter_badge: "Une fois par mois",
  newsletter_title: "Mieux se comprendre, pour mieux vivre — directement dans votre boîte mail",
  newsletter_title_short: "Une idée par mois pour mieux vous comprendre.",
  newsletter_text: "Une réflexion, un outil, une pratique. Rien de plus.",
  newsletter_placeholder: "votre@email.fr",
  newsletter_button: "Je m'abonne",
  newsletter_button_loading: "Inscription…",
  newsletter_success: "C'est noté. Vous recevrez le prochain message dès qu'il sera prêt.",
  newsletter_success_hint: "Vérifiez votre boîte mail, nous arrivons doucement.",
  newsletter_error_invalid: "Adresse email invalide.",
  newsletter_error_generic: "Une erreur est survenue. Réessayez.",
  newsletter_error_network: "Connexion impossible. Réessayez dans quelques instants.",
  newsletter_footnote: "Pas de spam · Désabonnement en 1 clic",
  // ── Boutons de partage (articles) ──
  share_label: "Partager",
  share_on: "Partager sur",
  share_pinterest: "Pinterest",
  share_whatsapp: "WhatsApp",
  share_copy: "Copier le lien",
  share_copied: "Copié !",
  share_copy_aria: "Copier le lien de l'article",
  // ── Page introuvable (404) ──
  notfound_badge: "Page introuvable",
  notfound_title: "Cette page n'existe plus ou a changé d'adresse.",
  notfound_text: "Elle a peut-être été déplacée ou renommée. Pas d'inquiétude — vous trouverez votre chemin depuis l'accueil.",
  notfound_home: "Retour à l'accueil",
  notfound_contact: "Prendre contact",
  notfound_link_coaching: "Coaching",
  notfound_link_relations: "Relations",
  notfound_link_happiness: "Happiness Design",
  notfound_link_booking: "Réserver une séance",
  // ── Page de maintenance ──
  maintenance_title: "Site en maintenance",
  maintenance_text: "Happy Humans est actuellement en cours de mise à jour.",
  maintenance_text2: "Nous revenons très vite !",
  maintenance_help: "Besoin d'aide ? Écrivez à",
  maintenance_email: DEFAULT_CONTACT_EMAIL,
}
