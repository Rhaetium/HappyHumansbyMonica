# Sauvegarde automatique du contenu

Chaque nuit (vers 3 h, heure de Paris), GitHub copie le contenu du site dans un **dépôt privé séparé**. Gratuit, daté, comparable jour par jour.

**Sauvegardé** : pages (dont brouillons), réglages (sans les clés secrètes), articles, médiathèque, historique des modifications, réservations, messages reçus, questionnaires.
**Non sauvegardé** : les clés d'API (préfixe `secret_`), les fichiers images eux-mêmes (seuls leurs adresses et descriptions le sont : voir « Limites »).

## Mise en place (une fois, 10 minutes)

1. **Créer le dépôt de sauvegarde** : GitHub → New repository → nom `happyhumans-sauvegardes`, **Private** (obligatoire : il contient des messages de visiteurs). Cocher « Add a README » pour qu'il ne soit pas vide.
2. **Créer un jeton limité à ce dépôt** : GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Repository access : *Only select repositories* → `happyhumans-sauvegardes`. Permissions : *Contents* = **Read and write**. Durée : 1 an (prévoyez un rappel pour le renouveler).
3. **Ajouter 4 secrets** dans le dépôt du site (Settings → Secrets and variables → Actions → New repository secret) :
   | Nom | Valeur |
   |---|---|
   | `BACKUP_REPO` | `Rhaetium/happyhumans-sauvegardes` |
   | `BACKUP_REPO_TOKEN` | le jeton de l'étape 2 |
   | `SUPABASE_URL` | l'adresse du projet Supabase (celle de `NEXT_PUBLIC_SUPABASE_URL`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clé « service role » de Supabase |
4. **Lancer un premier essai** : onglet Actions du dépôt du site → « Sauvegarde du contenu » → Run workflow. Au bout d'une minute, le dépôt `happyhumans-sauvegardes` contient un dossier `contenu/` avec un fichier par table et `_manifeste.json` (le nombre de lignes par table).

Si la sauvegarde échoue (jeton expiré, clé changée), GitHub envoie un e-mail d'échec au propriétaire du dépôt.

## Restaurer

- **Un texte, une page** : ouvrir `contenu/site_content.json` à la date voulue (historique du dépôt), copier la valeur, la recoller dans le CMS. Ou onglet Pages → Historique pour les modifications récentes.
- **Tout recharger** : à faire avec l'aide d'un développeur. Les fichiers JSON se réinjectent table par table (`upsert`). **Toujours tester d'abord sur un projet Supabase vide** (un projet gratuit de test suffit).

**À faire une fois : tester une restauration** sur un projet de test. Une sauvegarde jamais restaurée n'est pas une garantie.

## Limites

- Les **images** de la médiathèque restent dans le stockage Supabase : la sauvegarde garde leur liste, pas les fichiers. Les images d'origine du site (dossier `public/`) sont dans le dépôt du code.
- La sauvegarde est **quotidienne** : une modification de la journée peut ne pas y être encore.
- Les messages de visiteurs contiennent des données personnelles : le dépôt de sauvegarde doit rester **privé**, avec peu d'accès.
- Le plan gratuit de GitHub suffit (quelques Mo par jour au plus).
