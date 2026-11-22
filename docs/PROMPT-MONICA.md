# Prompt pour Monica : continuer le design, le look et l'UX avec Claude Code (mode cloud)

Ce fichier contient un questionnaire à remplir, puis un prompt à coller dans Claude Code (version web/cloud, dépôt
Rhaetium/HappyHumansbyMonica connecté). Il complète `docs/TRAVAILLER-AVEC-MONICA.md`.

**Avant de commencer :** le dépôt doit être connecté à Claude Code (application GitHub Claude), avec le droit de pousser des branches.

## 1. Questionnaire (15 minutes)

Répondez en une ou deux lignes par question. « Je ne sais pas » est une bonne réponse, on décidera ensemble.
Vous pouvez coller vos réponses à la suite du prompt : Claude sautera alors les questions déjà traitées.

**A. L'objectif**
1. Quand quelqu'un arrive sur le site, que doit-il ressentir en 5 secondes ? (3 mots maximum)
2. Quelle est l'action n°1 que vous voulez qu'il fasse ? (réserver une séance découverte, vous écrire, lire le blog, autre)
3. Qui sont vos visiteurs principaux ? (particuliers en transition, dirigeants, entreprises, autre)

**B. Ce qui ne va pas aujourd'hui**
4. Citez 3 à 5 choses qui vous dérangent sur le site actuel, avec la page si possible.
5. Y a-t-il quelque chose que vous aimez et qu'il ne faut surtout pas changer ?

**C. Références**
6. Donnez 2 ou 3 sites que vous aimez (même hors coaching) et ce que vous aimez dedans : couleurs, espace, photos, lisibilité, ton.
7. Donnez 1 site que vous n'aimez pas, avec la raison.

**D. Couleurs**
8. Gardez-vous le vert et l'or, ou voulez-vous une autre palette ? (si vous gardez : trop foncé, trop froid, trop sérieux ? si vous changez : une couleur de base et une ambiance)
9. Fond du site : plutôt crème chaud, blanc pur, ou une couleur plus marquée ?

**E. Typographie et lisibilité**
10. Les titres sont en serif élégant (Cormorant Garamond). Les gardez-vous, ou préférez-vous une police plus simple ?
11. Le texte est-il assez gros et lisible, surtout sur téléphone ? Plus gros, pareil ou plus petit ?

**F. Photos et illustrations**
12. Les photos actuelles vous représentent-elles ? (oui / non / à remplacer sur les pages : …)
13. Préférez-vous de vraies photos de vous et de vos séances, des photos d'ambiance, ou des illustrations ?

**G. Organisation et usage**
14. Le menu vous semble-t-il clair ? Quelles pages sont les plus importantes à mettre en avant ?
15. Des pages ou sections à supprimer, regrouper ou ajouter ? (page tarifs, parcours « première séance », témoignages…)
16. Où doit mener chaque bouton principal ? (« Réserver » vers l'agenda, « Me contacter » vers le formulaire ou un e-mail)
17. Avez-vous déjà eu des retours de clients sur le site (mobile compliqué, rien trouvé, trop long) ?

**H. Ton des textes**
18. Les textes vous ressemblent-ils ? Plus chaleureux, plus direct, plus court, plus philosophique ?

**I. Cadre**
19. Y a-t-il des éléments à ne pas toucher ? (logo, textes juridiques, certaines pages)
20. Souhaitez-vous tout valider avant mise en ligne ? (conseillé : oui)
21. Y a-t-il une échéance ? (lancement, événement)

## 2. Prompt à coller dans Claude Code

```text
Tu m'aides à faire évoluer le design, le look et l'expérience du site happyhumans.fr.
Le dépôt est Rhaetium/HappyHumansbyMonica (tu travailles sur un clone GitHub, sous Linux). Parle-moi en français,
simplement, sans jargon, et explique toujours ce que tu fais et pourquoi.

AVANT TOUT
1. Lis CLAUDE.md, AGENTS.md, docs/TRAVAILLER-AVEC-MONICA.md puis docs/GUIDE_MONICA.md.
2. Pars toujours d'un main à jour (git fetch). Vérifie avec :
   npx tsc --noEmit
   npx eslint app components lib hooks __tests__
   npx vitest run
   (Si une commande échoue pour une raison d'environnement, dis-le-moi au lieu de contourner.)

RÈGLE D'OR : le CMS est la source de vérité.
- Un texte, une photo, une couleur, une police ou un lien se change dans l'admin (/cms-admin), pas dans le code.
  Dis-moi où cliquer dans l'admin (Ctrl+K pour trouver un texte, Pages, Menu, Paramètres → Thème & Couleurs, Aide).
- Tu ne touches au code que si l'admin ne permet pas encore de le faire. Dans ce cas, le résultat doit rester
  modifiable depuis l'admin ensuite (champ dans PAGES_CONFIG, valeur par défaut dans lib/cms-defaults/…).
- Les couleurs de la marque ne s'écrivent jamais en dur : utilise les variables du thème
  (--hh-primary, --hh-dark, --hh-bg, --hh-accent, --hh-accent-light). Un test de garde l'impose.
- Les destinations des boutons sont des champs « … destination du bouton » (lib/safe-href.ts).
- Si un test de garde échoue, corrige le code, jamais le test.
- Aucun secret, aucune clé d'API dans le dépôt, les messages ou les tests.
- N'invente jamais un prix, un chiffre, un témoignage ou une certification.

COMMENT TRAVAILLER AVEC MOI
1. Commence par m'interviewer, un thème à la fois (objectif, ce qui ne va pas, références, couleurs,
   typographie, photos, organisation et navigation, ton des textes, contraintes). Pose 2 ou 3 questions
   maximum à la fois, avec des choix simples quand c'est possible. Si je ne sais pas, propose-moi un choix
   par défaut recommandé et avance. Si j'ai déjà répondu au questionnaire, ne repose pas ces questions.
2. Résume ce que tu as compris et fais-moi valider avant de modifier quoi que ce soit.
3. Propose 2 ou 3 pistes visuelles avec leur effet concret (par exemple « palette A : plus chaude, palette B :
   plus sobre »). Montre avant d'appliquer : utilise un brouillon du CMS ou une capture d'écran.
4. Applique par petites étapes, une branche et une pull request par sujet (couleurs, typographie, page d'accueil…).
5. Vérifie le résultat réel après chaque changement :
   - Lance le site avec « node scripts/dev-mock.cjs -p 3111 » (mot de passe admin « dev-local »).
   - Vérifie d'abord si un navigateur sans écran est disponible (Chrome ou Playwright). Si oui, prends des captures
     à 1280 px ET 390 px et dis-moi ce que tu vois. Si non, dis-le-moi clairement et appuie-toi sur l'aperçu Vercel
     de la pull request : donne-moi le lien en texte, je l'ouvre moi-même sur ordinateur et sur téléphone, et je
     te dis ce que je vois.
   - Ne prétends jamais avoir vérifié le visuel si tu ne l'as pas vu.
6. Pour une nouvelle palette, teste aussi une couleur très différente de l'actuelle pour repérer ce qui ne suivrait
   pas le thème (gris neutres, dégradé du logo, etc.) et dis-moi ce qui reste figé.
7. Ouvre la pull request : titre clair, description en français (ce qui change, où le retoucher, ce qui est
   vérifié, ce qui ne l'est pas).
8. NE FUSIONNE JAMAIS une pull request sans que je t'écrive clairement « fusionne ». Après une fusion, rappelle-moi
   de renvoyer le sitemap dans Search Console si des pages ont changé.

ÉTAT À CONNAÎTRE
- Déjà modifiable dans l'admin : textes, photos, menu, fil d'Ariane, pages libres (avec modèles), articles
  (brouillon, programmation), ordre et affichage des sections (accueil, à propos, coaching, entreprises,
  happiness design, relations, sparring partner), couleurs, polices, tailles, logo, SEO par page, redirections.
- Avant de commencer, regarde les pull requests ouvertes et le journal de main : les chantiers « couleurs qui suivent
  le thème », « destination des boutons » et « SVG et barre mobile » étaient en attente de fusion. S'ils ne sont pas
  dans main, dis-le-moi et ne pars pas d'un main qui ne les contient pas sans m'en parler.
- Pas encore vérifié visuellement : le rendu sur mobile et avec une palette différente de la palette par défaut.
  C'est une priorité de tes vérifications.

Commence maintenant : présente-toi en deux phrases, vérifie l'état du dépôt (branche, PR ouvertes), puis pose-moi
les premières questions sur mon objectif pour le site.
```
