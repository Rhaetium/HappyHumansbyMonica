# Propositions : reformuler les tics d'écriture

Objectif : garder la voix de Monica et ses faits, mais retirer les formules qui sonnent « texte générique » (tirets longs en série, « pas X, mais Y », promesse répétée d'une page à l'autre). **Rien n'est modifié.** Chaque ligne indique où se trouve le texte dans le CMS (admin → page → champ). Monica valide, ajuste ou refuse chaque proposition.

À ne pas toucher : la bio de Monica (Henkel, LVMH, L'Oréal, son mémoire sur le bonheur), la FAQ, les exemples de communication de la page Relations. Ce sont les passages les plus personnels et les plus précis du site.

Repères appliqués : une phrase qui dit un fait plutôt qu'une promesse ; au plus un tiret long par paragraphe ; pas de « vraiment » ; la même promesse ne revient pas sur trois pages.

---

## A. La promesse répétée (le plus utile pour le référencement)

« Retrouver clarté, confiance et une direction qui leur ressemble vraiment » apparaît sur l'accueil, sur /coaching, et une variante sur /temoignages. Trois pages qui disent la même chose se concurrencent. Une formulation par page :

| Où | Avant | Proposition |
|---|---|---|
| Accueil · `services_b2c_text` | Managers, dirigeants, entrepreneurs ou personnes en transition qui veulent retrouver de la clarté, de la confiance et une direction qui leur ressemble vraiment. | Vous êtes manager, dirigeant, entrepreneur ou en transition, et vous voulez voir plus clair avant de décider. Nous partons de votre situation. |
| Accueil · `home_card_coaching_desc` | Clarté, confiance et direction — un accompagnement sur mesure pour managers, dirigeants et personnes en transition. | Un accompagnement individuel pour managers, dirigeants et personnes en transition : prise de poste, reconversion, décisions difficiles. |
| Coaching · `hero_subtitle` | Executive Coach certifiée AoEC · EMCC Practitioner · Monica Schneider accompagne des managers, dirigeants et personnes en transition qui veulent retrouver clarté, confiance et une direction qui leur ressemble vraiment. | Executive Coach certifiée AoEC · EMCC Practitioner · Monica Schneider accompagne des managers, dirigeants et personnes en transition qui doivent choisir une direction : prise de poste, reconversion, décision difficile. `[À CONFIRMER : certifications]` |
| Témoignages · description Google (dans le code : `app/temoignages/layout.tsx`) | Ils ont travaillé avec Monica Schneider. Des parcours différents, une même expérience : retrouver de la clarté et avancer avec confiance. | Des personnes accompagnées par Monica Schneider racontent ce que les séances ont changé pour elles. |

## B. Les phrases en « pas X, mais Y »

| Où | Avant | Proposition |
|---|---|---|
| Entreprises · `domain_3_desc` | Construire une communication interne qui engage vraiment. Du sens, pas du bruit. Pour rebooster l'adhésion des équipes. | Construire une communication interne qui engage les équipes et donne du sens à ce qu'on leur dit. |
| Entreprises · `diff_text` (2e paragraphe) | Ce n'est pas un avantage anecdotique. C'est ce qui lui permet de comprendre vos enjeux sans que vous ayez à les expliquer — et de proposer des solutions qui collent à la réalité du terrain. | Cette expérience lui permet de comprendre vos enjeux sans que vous ayez à les expliquer, et de proposer des solutions qui collent à la réalité du terrain. |
| Relations · `manifestations_goodnews_text` | Bonne nouvelle : ces réactions ne relèvent pas d'un manque d'amour, mais d'un système biologique d'attachement activé. Les comprendre permet de sortir du piège et de retrouver la connexion. | Ces réactions viennent d'un système biologique d'attachement qui s'active. Elles ne disent rien d'un manque d'amour. Les comprendre permet de sortir du piège et de retrouver la connexion. |
| FAQ · question 3 (philo-coaching et thérapie) | …Le coaching philo s'intéresse à ce qui est vivant maintenant — vos valeurs, vos directions, vos tensions actuelles — et construit vers l'action. C'est une approche orientée présent et futur, pas de guérison au sens clinique. | …Le coaching philo s'intéresse à ce qui est vivant maintenant : vos valeurs, vos directions, vos tensions actuelles. Il construit vers l'action. C'est une approche tournée vers le présent et l'avenir, qui ne vise pas une guérison au sens clinique. |

## C. Tirets longs en série, anglicismes, formules

| Où | Avant | Proposition |
|---|---|---|
| À propos · `mentoring_text` (les « — » servent de puces) | Je vous offre mes conseils sur une problématique alignée avec mon expertise. — Comment être visible tout en restant authentique ? — Comment démontrer du leadership et signaler que nous sommes prêts pour la next step ? — Quel plan de communication interne mettre en place pour rebooster l'engagement ? — Comment naviguer les différences de communication au sein d'environnements multiculturels ? | Je vous offre mes conseils sur une problématique qui relève de mon expertise. Par exemple : comment être visible tout en restant authentique ? Comment démontrer du leadership et montrer que l'on est prêt pour l'étape suivante ? Quel plan de communication interne pour relancer l'engagement ? Comment gérer les différences de communication dans un environnement multiculturel ? |
| À propos · `bio_p5` | Je me suis construit une boîte à outils que j'ai appliquée à ma propre vie au cours des 6 dernières années — Happiness Design. Je l'ai aussi intégrée dans mes coachings et cela a fait la différence pour mes clients. | Je me suis construit une boîte à outils, Happiness Design, que j'applique à ma propre vie depuis six ans. Je l'ai aussi intégrée dans mes coachings, et cela a fait la différence pour mes clients. |
| À propos · `bio_p8` | Je souhaite aussi rendre cette boîte à outils du bonheur — même dans une vie chaotique — accessible au plus grand nombre. Ce projet s'appelle Happiness Design. | Je veux aussi rendre cette boîte à outils du bonheur accessible au plus grand nombre, même quand la vie est chaotique. Ce projet s'appelle Happiness Design. |
| Entreprises · `section_text` (2e paragraphe) | Avec 10 ans passés à développer des marques internationales pour Henkel, LVMH et L'Oréal — en Allemagne, France, Royaume-Uni et Europe de l'Est — j'ai vécu de l'intérieur… | Avec 10 ans passés à développer des marques internationales pour Henkel, LVMH et L'Oréal, en Allemagne, en France, au Royaume-Uni et en Europe de l'Est, j'ai vécu de l'intérieur… |
| Accueil · `home_card_hd_desc` | 12 séances pour reprendre les rênes de votre bonheur — au boulot et ailleurs. Un programme multidisciplinaire unique. | Un programme de 12 séances pour reprendre les rênes de votre bonheur, au travail comme ailleurs. Il mêle neurosciences, psychologie positive et philosophie pratique. |
| Accueil · `home_card_relations_desc` | Comprenez votre style d'attachement et transformez durablement vos relations — personnelles et professionnelles. | Comprenez votre style d'attachement pour mieux vivre vos relations, personnelles comme professionnelles. |
| Happiness Design · `tools_intro_2` | Happiness Design mêle neurosciences, psychologie positive, psychologie classique, méditation, pratique philosophique et design thinking — pour coller au plus près de votre chemin unique. | Happiness Design mêle neurosciences, psychologie positive, psychologie classique, méditation, pratique philosophique et design thinking, et s'adapte à votre situation. |
| Happiness Design · `step_08_desc` (étape « Homo risibilis ») | Imparfait mais impactant — l'action salvatrice | Passer à l'action, même imparfaite. `[À VÉRIFIER : sens voulu par Monica]` |

## D. Deux pages disent la même chose

Le paragraphe « Quand une équipe perd de sa cohérence… Je travaille avec les dirigeants et les entreprises pour remettre de l'alignement… » est presque identique sur **Entreprises** (`section_text`) et **Coaching** (`coaching_b2b_text`). Même texte sur deux pages : Google et les IA n'en retiennent qu'une. Proposition : garder le texte complet sur Entreprises, et sur Coaching le réduire à une phrase avec un lien :

> Pour les dirigeants et les équipes : coaching de dirigeants, ateliers de cohésion, accompagnement du changement et séminaires sur mesure. Le détail est sur la page Entreprises.

## E. Une incohérence de faits à trancher

- **Langues** : la page Sparring partner annonce « 5 langues : FR, EN, RO, DE, ES », alors que les données structurées du site (lues par Google et les IA) n'en déclarent que trois (français, anglais, roumain). `[À CONFIRMER par Monica]` : si les cinq sont exactes, je corrige les données structurées.

## F. Ce que je n'ai pas reformulé
La page **Relations** contient de longs passages de théorie (Bowlby, Rogers, Fromm) avec de nombreux tirets d'incise. Ils sont clairs et attribués à leurs auteurs ; je préfère ne pas y toucher sans Monica.
