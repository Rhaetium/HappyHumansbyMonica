// Textes par défaut de la page « merci » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'

export const MERCI_DEFAULTS: Record<string, string> = {
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_message_recu: "Message reçu",
  t_merci_pour_votre_message: "Merci pour votre message.",
  t_monica_vous_repondra_personnelleme: "Monica vous répondra personnellement **sous 48h** à l'adresse que vous avez indiquée.",
  t_en_attendant_vous_pouvez: "En attendant, vous pouvez explorer les ressources sur les relations et le coaching.",
  t_explorer_les_relations: "Explorer les relations",
  t_reserver_une_seance: "Réserver une séance",
  t_pas_de_reponse_recue: "Pas de réponse reçue ?",
  t_verifiez_votre_dossier_spam: `Vérifiez votre dossier spam ou écrivez directement à [${DEFAULT_CONTACT_EMAIL}](mailto:${DEFAULT_CONTACT_EMAIL})`,
}
