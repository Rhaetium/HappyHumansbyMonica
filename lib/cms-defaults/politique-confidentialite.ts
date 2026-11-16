// Textes par défaut de la page « politique-confidentialite » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'

export const POLITIQUE_CONFIDENTIALITE_DEFAULTS: Record<string, string> = {
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_donnees_personnelles: "Données personnelles",
  t_politique_de_confidentialite: "Politique de confidentialité",
  t_derniere_mise_a_jour: "Dernière mise à jour : juin 2026",
  t_responsable_du_traitement: "Responsable du traitement",
  t_happy_humans_monica_schneider: "Happy Humans — Monica Schneider",
  t_happyhumans_coaching_gmail_com: DEFAULT_CONTACT_EMAIL,
  t_donnees_collectees: "Données collectées",
  t_nous_collectons_uniquement_les: "Nous collectons uniquement les données que vous nous transmettez volontairement :",
  t_nom_et_adresse_email: "Nom et adresse email (formulaire de contact)",
  t_nom_email_type_de: "Nom, email, type de séance, créneau choisi (formulaire de réservation)",
  t_resultats_du_test_de: "Résultats du test de style d'attachement (anonymes)",
  t_finalites_du_traitement: "Finalités du traitement",
  t_repondre_a_vos_demandes: "Répondre à vos demandes de contact ou de réservation",
  t_organiser_et_assurer_le: "Organiser et assurer le suivi des séances de coaching",
  t_respecter_les_obligations_legales: "Respecter les obligations légales applicables",
  t_duree_de_conservation: "Durée de conservation",
  t_2_ans_maximum_pour: "2 ans maximum pour les données de contact et de réservation.",
  t_les_resultats_anonymes_du: "Les résultats anonymes du test d'attachement ne sont pas conservés de manière identifiable.",
  t_hebergement_et_sous_traitants: "Hébergement et sous-traitants",
  t_les_donnees_peuvent_etre: "Les données peuvent être traitées par des prestataires techniques sélectionnés : **Vercel** (hébergement) et **Supabase** (base de données).",
  t_cookies: "Cookies",
  t_pas_de_cookies_tiers: "Pas de cookies tiers.",
  t_pas_de_publicite: "Pas de publicité.",
  t_pas_de_partage_avec: "Pas de partage avec des tiers.",
  t_les_cookies_strictement_necessaire: "Les cookies strictement nécessaires au fonctionnement du site sont utilisés sans consentement préalable.",
  t_vos_droits_rgpd: "Vos droits (RGPD)",
  t_conformement_au_rgpd_vous: "Conformément au RGPD, vous pouvez demander :",
  t_l_acces_a_vos: "L'accès à vos données personnelles",
  t_la_rectification_de_donnees: "La rectification de données inexactes",
  t_l_effacement_de_vos: "L'effacement de vos données",
  t_la_limitation_ou_l: "La limitation ou l'opposition à certains traitements",
  t_happyhumans_coaching_gmail_com_2: DEFAULT_CONTACT_EMAIL,
  t_2026_happy_humans_monica: "© 2026 Happy Humans — Monica Schneider. Tous droits réservés.",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Politique de confidentialité",
  seo_description: "Consultez la politique de confidentialité et la protection des données personnelles du site Happy Humans.",
  seo_image: '',
  // ── Textes ajoutés pour le CMS (étaient en dur dans le code) ──
  email_label: "Email :",
  rights_intro: "Pour exercer vos droits ou poser une question relative à vos données, contactez-nous à",
}
