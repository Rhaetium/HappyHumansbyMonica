# Questionnaires — note opérationnelle

Ce module est conçu pour que Monica puisse créer et publier des questionnaires
depuis l’administration CMS, collecter les réponses, et voir le récap de
participation par jour.

## 1. Créer un questionnaire

1. Se connecter à `/cms-admin`, puis aller dans l’onglet **Questionnaires**.
2. Cliquer **Créer / éditer**.
3. Remplir le titre, l’adresse (slug), la description, le texte d’introduction
   et la note sur la confidentialité.
4. Ajouter les questions (échelle, choix multiples, texte court, texte long).
5. Cliquer **Enregistrer le questionnaire**.

Le questionnaire est disponible à l’adresse `/questionnaire/<slug>`.

## 2. Utiliser le récap par jour

Dans le même onglet, l’option **Récap par jour** affiche :
- le nombre de participations aujourd’hui
- le total des participations et le nombre de questionnaires complétés
- un récap par questionnaire et par jour

## 3. Modifier un questionnaire existant

- Dans **Créer / éditer**, modifier les textes et les questions, puis réenregistrer.
- Les participants en cours ne sont pas impactés : seules les nouvelles soumissions
  suivent la nouvelle version.

## 4. Confidentialité

- Par défaut, les questionnaires sont anonymes.
- Si un questionnaire demande un email, celui-ci est stocké avec la réponse.
- La note de confidentialité affichée au participant doit rester cohérente avec
  la politique de confidentialité du site.

## 5. Migration

- La migration `supabase/migrations/20261103000000_questionnaires_and_usage.sql`
  crée les tables et la vue de récap.
- Avant de la déployer, vérifier que Supabase accepte les migrations dans l’environnement cible.
- La vue de récap doit être rafraîchie si elle n’est pas mise à jour automatiquement.

## 6. Limites actuelles

- Aucune limite de débit n’est appliquée côté public à ce stade.
- La vue de récap par jour est alimentée par une matérialisée ; si elle n’est pas
  à jour, l’administration peut la rafraîchir depuis l’API.
- Le premier MVP ne calcule pas de score de résultat ; cela peut être ajouté
  ensuite pour les questionnaires à score (ex. style d’attachement).

## 7. Dépannage rapide

- Si le questionnaire n’apparaît pas dans le récap, vérifier que la migration
  a bien été appliquée.
- Si une soumission publique échoue, vérifier que le questionnaire existe et que
  les questions obligatoires sont remplies.
