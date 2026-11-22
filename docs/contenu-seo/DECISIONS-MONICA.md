# Décisions à trancher : stratégie Searchable (environ 30 minutes)

Issu de l'audit Searchable du 19/11/2026 (4 thèmes à 0 % de visibilité, 19 prompts suivis). Les brouillons d'articles et les propositions de textes sont dans ce même dossier (`docs/contenu-seo/`). **Rien n'est publié.**

**Comment répondre :** « OK » pour accepter la recommandation, ou une phrase pour la changer. « Je ne sais pas » est une réponse valable : le défaut s'applique alors.

## Comment retrouver ce fichier

- **Sur GitHub (le plus simple) :** ouvrez le dépôt `Rhaetium/HappyHumansbyMonica`, dossier `docs`, puis `contenu-seo`, puis `DECISIONS-MONICA.md`. Tant que la pull request n'est pas fusionnée, ouvrez la pull request « Docs : liste de décisions Searchable pour Monica » (onglet Pull requests), puis « Files changed ».
- **Dans Claude Code (cloud) :** ouvrez le dépôt, puis écrivez : « Lis docs/contenu-seo/DECISIONS-MONICA.md et pose-moi les questions une par une, avec ta recommandation. » Si le fichier n'apparaît pas, c'est que la pull request n'est pas encore fusionnée : demandez à Claude de lire la branche `docs/decisions-monica-searchable`.
- **Vos réponses :** collez-les dans la conversation avec Claude, ou dites-les à la voix. Claude les reporte dans les textes, sans rien inventer.

## A. Cohérence du site : à décider en premier, car ça bloque les textes

| # | Question | Recommandation par défaut |
|---|---|---|
| 1 | **Annulation d'une séance : 24 h ou 48 h ?** La FAQ dit 48 h (séance due au-delà), la page de réservation dit 24 h sans frais. | Choisir la règle réellement appliquée, puis aligner les deux pages. |
| 2 | **Tarifs : afficher un prix ou rester « sur devis » ?** La FAQ promet aujourd'hui les tarifs sans les donner. | « Sur devis » pour les équipes, un tarif affiché pour les séances individuelles si souhaité. Sinon, retirer le mot « tarifs » des descriptions. |
| 3 | **Certifications (AoEC, EMCC Practitioner) : afficher ou retirer ?** | Afficher une ligne sur À propos avec l'intitulé exact des accréditations. Sinon, ne pas les citer du tout (la description les annonce sans que la page les montre). |
| 4 | **Happiness Design : la définition proposée est-elle juste ?** (12 séances, neurosciences, psychologie positive, philosophie pratique) | Corriger en deux phrases. Elle est reprise dans la FAQ et les descriptions. |
| 5 | **Sous-titre du blog :** il ressemble à un texte de voyage (« une arrivée trop tardive, une adresse trouvée… »). Est-ce un reste d'un autre site ? | Le remplacer par la version proposée (articles sur le coaching, les relations, le leadership). |
| 6 | **Témoignages : peut-on les publier ?** | Si oui, aligner la description Google avec la page. Si non, ne pas en parler. |

## B. Le vécu de Monica : à fournir (rien ne sera inventé)

| # | Ce qu'il faut | Pour quel article |
|---|---|---|
| 7 | Une situation vécue en équipe, anonymisée, avec ce qui a changé | Coaching d'équipe (9 prompts) |
| 8 | Un indicateur concret observé chez un client, sans chiffre inventé | Coaching d'équipe |
| 9 | Les durées habituelles d'un accompagnement | Coaching d'équipe |
| 10 | Une phrase par style d'attachement, dans ses mots | Style d'attachement (4 prompts) |
| 11 | Sa propre transition en deux phrases (marketing → coaching, 2020) et un exemple client anonymisé | Transition professionnelle (4 prompts) |
| 12 | Une anecdote ou un exercice proposé en séance | Bien-être au travail (2 prompts) |

*Astuce : un message vocal de 2 minutes par point suffit, la rédaction se fait à partir de là.*

## C. Stratégie

| # | Question | Recommandation par défaut |
|---|---|---|
| 13 | **Par quel article commencer ?** | Coaching d'équipe (9 des 19 prompts suivis), puis un article par semaine. |
| 14 | **Rythme : combien de temps y consacrer ?** | Un article par semaine, pas plus : mieux vaut peu et vrai. |
| 15 | **Relire chaque article avant mise en ligne ?** | Oui : brouillon dans le CMS, aperçu, puis « publier ». |
| 16 | **Les thèmes sont-ils les bons ?** Des prompts hors sujet ou à ne pas viser ? | Barrer ceux qu'elle ne veut pas : aucun texte ne sera écrit pour eux. |
| 17 | **Cible principale : équipes et entreprises, ou particuliers en transition ?** | Équipes d'abord (plus de prompts, et ce sont des demandes de devis). |

## D. Mesure

| # | Question | Recommandation par défaut |
|---|---|---|
| 18 | **Quand regarde-t-on le résultat ?** | 3 à 4 semaines après chaque publication : relancer l'audit Searchable sur l'URL de l'article, pas avant. |
| 19 | **Que veut-on voir bouger ?** | Le pourcentage de visibilité des thèmes à 0 %, puis les demandes de séance découverte. |

## Limites

- Les chiffres Searchable ont pu changer depuis le 19/11/2026 : ils n'ont pas été revérifiés. Un export des prompts permettrait de refaire le classement.
- Les décisions A1 à A6 changent des textes déjà en ligne : à faire dans le CMS (admin), pas dans le code.
