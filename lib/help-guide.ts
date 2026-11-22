// Aide intégrée à l'admin (onglet « Aide ») : que faire pour quoi, la routine de la semaine, et des phrases toutes prêtes
// pour demander une modification à un assistant sans jamais contourner le CMS. Donnée pure, testée dans __tests__/lib/help-guide.test.ts
// (chaque recette renvoie vers un onglet qui existe).

export type HelpRecipe = {
  id: string
  emoji: string
  title: string
  /** Onglet de l'admin où ça se fait (id d'onglet). */
  tab: string
  steps: string[]
}

export const HELP_RECIPES: HelpRecipe[] = [
  { id: 'texte', emoji: '✏️', title: 'Changer un texte du site', tab: 'pages',
    steps: ['Appuyez sur Ctrl + K (ou Cmd + K) et tapez quelques mots du texte.', 'Choisissez le texte dans la liste : il s’ouvre.', 'Modifiez-le, puis « Enregistrer le brouillon ».', 'Relisez, puis « Publier » : c’est en ligne.'] },
  { id: 'photo', emoji: '📷', title: 'Changer une photo', tab: 'pages',
    steps: ['Ouvrez la page, puis le bloc qui contient la photo.', '« Upload » (ou « Médiathèque » pour une photo déjà envoyée).', 'Enregistrez le brouillon, puis publiez.'] },
  { id: 'article', emoji: '📝', title: 'Écrire un article', tab: 'new',
    steps: ['Le titre est la question que se pose le lecteur.', 'Gardez le modèle : réponse courte en premier, trois intertitres, trois questions fréquentes.', 'La liste de contrôle à droite vous dit ce qui manque.', 'Publiez quand tout est coché.'] },
  { id: 'page', emoji: '📄', title: 'Créer une nouvelle page', tab: 'custom-pages',
    steps: ['« Nouvelle page », puis choisissez un modèle (offre, tarifs, atelier, témoignages…).', 'Remplacez les passages [entre crochets].', 'Regardez l’aperçu à droite.', 'Activez « En ligne », puis ajoutez-la au menu.'] },
  { id: 'menu', emoji: '🧭', title: 'Changer le menu', tab: 'menu',
    steps: ['Flèches ▲ ▼ pour l’ordre, clic dans un nom pour le modifier.', '« Ajouter un lien » pour une nouvelle entrée.', 'L’œil masque un lien sans le supprimer.'] },
  { id: 'style', emoji: '🎨', title: 'Changer les polices, la taille du texte, les couleurs, le logo', tab: 'settings',
    steps: ['Paramètres, puis « Thème & Couleurs ».', 'Choisissez un gabarit de style, puis ajustez police, taille, épaisseur.', 'Les curseurs de taille du logo sont dans le même panneau.', 'Enregistrez.'] },
  { id: 'visibilite', emoji: '🔍', title: 'Savoir si Google et les assistants IA trouvent le site', tab: 'visibilite',
    steps: ['Le résumé en haut donne l’état de la visibilité dans les assistants IA.', 'Search Console montre les recherches qui mènent au site.', 'Les fichiers llms.txt, robots.txt et sitemap.xml doivent tous être au vert.'] },
  { id: 'connexions', emoji: '🔌', title: 'Brancher les e-mails, Instagram, Unsplash', tab: 'connexions',
    steps: ['Collez la clé demandée dans la case correspondante.', 'Enregistrez : elle est stockée chiffrée et n’est jamais réaffichée.'] },
  { id: 'messages', emoji: '💬', title: 'Répondre aux messages et aux réservations', tab: 'messages',
    steps: ['Les messages non lus sont comptés sur l’onglet.', 'Les réservations sont dans l’onglet « Réservations ».'] },
]

export type HelpRoutine = { id: string; label: string; tab: string }

/** La routine de la semaine : peu de choses, toujours les mêmes. */
export const WEEKLY_ROUTINE: HelpRoutine[] = [
  { id: 'article', label: 'Écrire ou publier un article (un par semaine)', tab: 'new' },
  { id: 'brouillons', label: 'Publier les brouillons en attente', tab: 'contenu' },
  { id: 'visibilite', label: 'Regarder la visibilité (Google et assistants IA)', tab: 'visibilite' },
  { id: 'messages', label: 'Répondre aux messages', tab: 'messages' },
  { id: 'sauvegarde', label: 'Télécharger une sauvegarde du contenu (une fois par mois)', tab: 'aide' },
]

/** Règle à joindre à toute demande de modification faite à un assistant : le CMS reste la source de vérité. */
export const CMS_RULE =
  'Fais cette modification dans le CMS (contenu ou réglages), pas dans le code, sauf si c’est impossible. Dis-moi ce que tu as changé, où, et comment vérifier.'

export type HelpPrompt = { id: string; label: string; text: string }

export const ASK_PROMPTS: HelpPrompt[] = [
  { id: 'texte', label: 'Modifier un texte', text: `Sur la page « [page] », remplace « [ancien texte] » par « [nouveau texte] ». ${CMS_RULE}` },
  { id: 'page', label: 'Créer une page', text: `Crée une page « [titre] » à partir du modèle « [offre / tarifs / atelier / témoignages] », avec ce contenu : [contenu]. Garde-la hors ligne pour que je la relise. ${CMS_RULE}` },
  { id: 'article', label: 'Rédiger un article', text: `Écris un article « [question] » avec le gabarit du CMS (réponse courte, trois intertitres, trois questions fréquentes), sans inventer de chiffre. Garde-le en brouillon. ${CMS_RULE}` },
  { id: 'style', label: 'Changer l’apparence', text: `Je veux [un texte plus gros / une autre police / d’autres couleurs]. Utilise les réglages du CMS (Thème & Couleurs → Typographie). ${CMS_RULE}` },
]
