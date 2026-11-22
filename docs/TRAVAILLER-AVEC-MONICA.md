# Travailler avec Monica : le CMS est la source de vérité

À lire avant toute modification demandée par Monica (par un développeur ou par un assistant IA). Le site est conçu pour qu'elle le modifie seule : votre rôle est de lui en donner les moyens, pas de modifier le site à sa place dans le code.

## La règle

**Ce que voit un visiteur vient du CMS.** Le code ne contient que la structure et des valeurs par défaut. Une valeur saisie dans l'admin (table `site_content`, `cms_settings_kv`, pages libres, articles) **remplace** toujours la valeur par défaut du code.

Conséquence à ne jamais oublier : **changer un texte par défaut dans `lib/cms-defaults/` ne change pas le site en ligne si Monica a déjà enregistré ce texte.** Dites-le-lui, ou changez la valeur dans le CMS.

## Que faire selon la demande

| Monica demande… | On fait |
|---|---|
| Changer un texte, une photo | Dans le CMS (Pages, ou Ctrl+K pour trouver le texte). Pas dans le code. |
| Un texte qui n'est pas modifiable | Ajouter le champ : clé dans `lib/cms-defaults/<page>.ts` **et** champ dans `PAGES_CONFIG` (`components/cms/admin/config.ts`). `npm test` dit ce qui manque. |
| Une nouvelle page | Page libre (admin → Contenu → Pages libres, avec un modèle). Pas de nouveau fichier `app/…/page.tsx` sauf besoin technique réel. |
| Un article | Admin → Nouvel article, avec le gabarit (`lib/article-template.ts`). |
| Un réglage (couleur, police, taille, SEO, robots IA…) | Réglage du CMS (`app/api/cms/settings/route.ts` + `SETTINGS_GROUPS`), lu côté serveur. Jamais de constante en dur. |
| Une clé d'API ou un mot de passe | Onglet Connexions (stocké chiffré, préfixe `secret_`). Jamais dans le code, un test, un message ou un fichier. La variable Vercel reste prioritaire. |
| Le menu | Admin → Menu. Pas dans `Header.tsx`. |

## Avant de dire « c'est fait »

1. `npx tsc --noEmit`, `npx eslint app components lib __tests__`, `npx vitest run` passent.
2. Ce qui a été modifié l'a été **dans le CMS** (ou, pour du code, que le résultat reste modifiable depuis l'admin).
3. Vérifier dans un navigateur (`npm run dev:mock`, mot de passe `dev-local`) ce que Monica verra.
4. Dire à Monica ce qui a changé, où, et comment le retoucher elle-même.
5. Après un déploiement qui change des pages : lui rappeler de renvoyer le sitemap dans Search Console.

## Garde-fous automatiques

- `__tests__/cms/consistency.test.ts` : chaque texte lu par une page a un champ dans l'admin et une valeur par défaut.
- `__tests__/cms/no-hardcoded-text.test.ts` : aucune phrase française en dur dans une page publique.
- `__tests__/lib/admin-tab-groups.test.ts` et `help-guide.test.ts` : un onglet ajouté doit avoir un thème, et l'aide ne renvoie que vers des onglets existants.

Si un de ces tests échoue, **corrigez le code, pas le test**.

## Ne pas faire

- Fusionner une PR sans que Monica ou son responsable ait dit « fusionne ».
- Inventer un prix, un chiffre, un témoignage ou une certification : les modèles et les articles ne reprennent que des faits déjà publiés, le reste est entre [crochets].
- Écrire des secrets dans le dépôt (l'historique les garde même après suppression).
- Contourner les brouillons : les pages historiques passent par « Enregistrer le brouillon » puis « Publier ».

## Où est quoi

- Architecture et règles détaillées : `docs/CMS_ARCHITECTURE.md`.
- Guide pour Monica (pas à pas) : `docs/GUIDE_MONICA.md` et l'onglet **Aide** de l'admin (`lib/help-guide.ts`).
- Déploiement : `docs/DEPLOIEMENT.md`.
- Sauvegarde du contenu : onglet Aide → « Télécharger la sauvegarde » (`/api/cms/export`, sans secrets).
