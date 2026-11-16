// Textes par défaut de la page « mentions-legales » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (app/cms-admin/page.tsx).
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'
import { SITE_URL } from '@/lib/site-url'

export const MENTIONS_LEGALES_DEFAULTS: Record<string, string> = {
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_cadre_legal: "Cadre légal",
  t_mentions_legales: "Mentions légales",
  t_derniere_mise_a_jour: "Dernière mise à jour : juin 2026",
  t_identite_de_l_editeur: "Identité de l'éditeur",
  t_nom_commercial_happy_humans: "**Nom commercial :** Happy Humans",
  t_responsable_monica_schneider: "**Responsable :** Monica Schneider",
  t_activite_philo_coaching_executive: "**Activité :** Philo-coaching, executive coaching, philosophical counselling, sparring partner",
  t_email: "Email :",
  t_happyhumans_coaching_gmail_com: DEFAULT_CONTACT_EMAIL,
  t_site: "Site :",
  // Adresse du site affichée dans les mentions légales : toujours celle de lib/site-url.ts (la clé garde son ancien nom
  // pour ne pas perdre les textes déjà saisis dans le CMS).
  t_happyhumans_vercel_app: new URL(SITE_URL).hostname,
  t_hebergeur: "Hébergeur",
  t_societe_vercel_inc: "**Société :** Vercel Inc.",
  t_adresse_340_pine_street: "**Adresse :** 340 Pine Street Suite 701, San Francisco, CA 94104, USA",
  t_site_2: "Site :",
  t_vercel_com: "vercel.com",
  t_base_de_donnees: "Base de données",
  t_service_supabase_supabase_inc: "**Service :** Supabase (Supabase Inc.)",
  t_site_3: "Site :",
  t_supabase_com: "supabase.com",
  t_propriete_intellectuelle: "Propriété intellectuelle",
  t_l_ensemble_des_contenus: "L'ensemble des contenus présents sur ce site (textes, visuels, éléments graphiques, structure et code) est la propriété exclusive de Happy Humans — Monica Schneider et est protégé par le droit de la propriété intellectuelle. Toute reproduction, diffusion, adaptation ou exploitation, totale ou partielle, sans autorisation préalable écrite est interdite.",
  t_credits_photo_happy_humans: "Crédits photo : Happy Humans et banques d'images sous licence.",
  t_limitation_de_responsabilite: "Limitation de responsabilité",
  t_happy_humans_s_efforce: "Happy Humans s'efforce de fournir des informations fiables et à jour, sans garantie d'exhaustivité ou d'absence d'erreur. Happy Humans ne pourra être tenue responsable des dommages directs ou indirects liés à l'utilisation du site, à l'indisponibilité temporaire du service ou à l'usage d'informations externes référencées. Les liens sortants sont fournis à titre informatif et n'emportent pas validation de leur contenu.",
  t_contact: "Contact",
  t_happyhumans_coaching_gmail_com_2: DEFAULT_CONTACT_EMAIL,
  t_2026_happy_humans_monica: "© 2026 Happy Humans — Monica Schneider. Tous droits réservés.",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Mentions légales",
  seo_description: "Consultez les mentions légales du site Happy Humans — Monica Schneider, executive coaching et philo-coaching.",
  seo_image: '',
  // ── Textes ajoutés pour le CMS (étaient en dur dans le code) ──
  contact_intro: "Pour toute demande légale ou relative aux données personnelles, vous pouvez nous écrire à",
}
