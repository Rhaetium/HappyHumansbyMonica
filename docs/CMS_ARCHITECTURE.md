# CMS — architecture et règles

Ce document explique comment le contenu du site est branché sur le CMS, et **comment ajouter un texte ou une page sans casser l'édition**.

## Le principe : une seule source de vérité

Chaque page pilotée par le CMS a un module de textes par défaut :

```
lib/cms-defaults/<page>.ts      →  export const <PAGE>_DEFAULTS = { cle: 'texte par défaut', … }
```

Ce module est lu **à la fois** par :

| Qui | Comment |
|---|---|
| la page publique | `const c = useCmsContent('<page>', <PAGE>_DEFAULTS)` puis `{c.cle}` |
| l'admin | `lib/cms-page-defaults.ts` (`PAGE_DEFAULTS`) pré-remplit le formulaire |

Avant, ces textes existaient en **deux copies** qui divergeaient (l'admin disait « 45 min », le site « 1h »), et un clic sur « Sauvegarder » écrivait en base le mauvais texte. Ne dupliquez jamais un texte par défaut : modifiez uniquement le module de la page.

Les valeurs saisies dans l'admin sont stockées dans la table Supabase `site_content` (`page`, `block_key`, `value`) et **remplacent** le défaut. Une valeur vide retombe sur le défaut ; pour masquer un texte, saisir un espace.

## Ajouter un texte modifiable

1. Ajouter la clé et son texte dans `lib/cms-defaults/<page>.ts`.
2. Dans la page : `{c.ma_cle}` (lecture simple, rendue côté serveur → indexable par Google).
3. Ajouter un champ dans `PAGES_CONFIG.<page>` (`app/cms-admin/page.tsx`) :
   `{ key: 'ma_cle', label: 'Groupe — Libellé', type: 'text' | 'textarea' | 'richtext' | 'image' | 'select' | 'sections' | 'custom-sections' | 'list' }`.
   La partie avant « — » dans le libellé sert de titre de groupe dans l'admin.

`npm test` vérifie ces trois points (`__tests__/cms/consistency.test.ts`) : si vous oubliez une étape, le test dit exactement quelle clé manque.

## Aucun texte en dur sur le site public

Règle du projet : **toute phrase visible par un visiteur vient du CMS**. Le code ne contient que la structure et les valeurs par défaut de `lib/cms-defaults/`.

`__tests__/cms/no-hardcoded-text.test.ts` scanne `app/` et `components/` et échoue dès qu'une phrase française réapparaît en dur, en indiquant `fichier:ligne` et le texte fautif.

- Sont ignorés, volontairement : l'administration (`app/cms-admin/`, `components/admin/`), les outils d'édition (barre d'édition en ligne, médiathèque, éditeurs de texte) et les métadonnées de secours de `app/layout.tsx`.
- Pour autoriser un texte précis (attribut d'accessibilité, libellé visible seulement en mode édition), l'ajouter dans `ALLOWED_STRINGS` du test avec sa raison.
- Piège déjà rencontré : `{c.titre || 'Un texte'}` est **inutile** (le défaut est toujours fusionné) et masque une divergence — un tel littéral affichait « Un accompagnement pour deux contextes » alors que le défaut disait « Comment puis-je vous aider ? ». Écrire simplement `{c.titre}`.

### `c.ma_cle` ou `c.get('ma_cle')` ?

`c.get()` rend un champ cliquable pour l'édition en ligne, mais il est chargé en `ssr: false` : son texte **n'est pas dans le HTML envoyé par le serveur** (donc invisible pour Google au premier chargement). Les nouveaux champs utilisent la lecture simple `c.ma_cle`. Les anciens `c.get()` sont conservés tels quels.

## Textes avec gras, italique, liens

Utiliser le composant `components/Rich.tsx` :

```tsx
<p><Rich text={c.ma_cle} linkClassName="underline" /></p>
```

Dans l'admin, la valeur s'écrit `**gras**`, `*italique*`, `[texte](https://…)`, et un retour à la ligne devient un saut de ligne. Pas de HTML : le contenu de la base n'est jamais interprété comme du code.

## Listes

Trois formes, selon le besoin :

| Forme | Pour quoi | Où |
|---|---|---|
| **Liste répétable** | ajouter, retirer et réordonner des cartes (programmes, témoignages, domaines, formules, situations, questions de la FAQ) | champ `type: 'list'` → `lib/cms-lists.ts` |
| Texte multiligne | des puces qu'on ne réordonne pas (`flash_features`, `experience_items`) | un seul `textarea`, un élément par ligne |
| Champ simple | un texte unique | une clé |

### Listes répétables (`type: 'list'`)

Registre : `LIST_DEFS` dans `lib/cms-lists.ts` (id stable, libellé, champs de chaque élément, ancien préfixe numéroté).

| Liste | Page | Anciens champs |
|---|---|---|
| `faq_questions` | FAQ | `faq_1_q` … `faq_15_a` |
| `coaching_programs` | Coaching | `program_1_label` … `program_4_*` |
| `coaching_testimonials` | Coaching | `testimonial_1_quote` … `testimonial_4_*` |
| `entreprises_domains` | Entreprises | `domain_1_title` … `domain_6_desc` |
| `entreprises_pricing` | Entreprises | `pricing_card_1_title` … `pricing_card_3_cta` |
| `sparring_use_cases` | Sparring Partner | `use_case_1_title` … `use_case_5_desc` |

**Stockage** : un seul champ du CMS, en JSON `[{ "q": "…", "a": "…" }, …]`, qui suit le circuit brouillon → publication comme n'importe quel champ. Aucune migration SQL.

**Reprise de l'existant** : tant qu'aucune liste JSON n'est enregistrée, `readList` reconstruit les éléments à partir des anciens champs numérotés — donc les textes déjà saisis restent en place. Les valeurs qui ne venaient pas d'un texte (lien du bouton, mise en avant, icône) sont redonnées d'après la position par `legacy.extras`. Enregistrer une liste fige le JSON ; « ↺ Rétablir la liste d'origine » remet la valeur à vide et fait retomber sur les anciens champs. Les clés numérotées restent dans les modules de défauts : elles servent de source de repli, ne les supprimez pas.

**Règles de sécurité** (testées dans `__tests__/lib/cms-lists.test.ts`) :

- JSON invalide ou pas un tableau → on retombe sur les anciens champs, la page ne casse jamais ;
- `[]` est une valeur légitime : une liste vidée volontairement reste vide ;
- seuls les champs déclarés dans la définition sont lus, une clé inconnue est ignorée ;
- un élément dont tous les champs texte sont vides est masqué (c'est ainsi qu'on retire une ancienne carte) ;
- dans l'admin, la liste affichée part de la valeur JSON, sinon des anciens champs (donc des textes déjà saisis).

**Dans une page** :

```tsx
const programs = readList(c.content, 'coaching_programs').filter(p => p.label.trim())
```

`c.content` contient déjà les défauts de la page. La FAQ passe en plus `FAQ_ITEMS`, car ses anciens emplacements ne figurent pas dans `FAQ_DEFAULTS` : `readList(c.content, 'faq_questions', FAQ_ITEMS)`.

**Dans l'admin** : champ `{ key: 'coaching_programs', label: 'Programmes — Cartes…', type: 'list' }` ; l'éditeur `ListEditor` reçoit `readList(pageContentOf(editedContent, activePage), section.key)` et écrit `serializeList(items)` dans le champ.

**Ajouter une liste** :
1. décrire la liste dans `LIST_DEFS` (champs, préfixe et nombre d'anciens emplacements, `extras` si des valeurs venaient de la position) ;
2. ajouter `{ key: '<id>', label: '… — Cartes', type: 'list' }` dans `PAGES_CONFIG` ;
3. ajouter `'<id>': ''` aux défauts de la page (le test de cohérence l'exige) ;
4. lire la liste dans la page avec `readList(c.content, '<id>')` ;
5. le test `consistency.test.ts` vérifie que chaque champ `list` de l'admin a une définition et que la page lit la clé.

## Ajouter une page

1. Créer `lib/cms-defaults/<page>.ts` et l'ajouter à `PAGE_DEFAULTS` (`lib/cms-page-defaults.ts`).
2. Créer le bloc `'<page>': { label, emoji, sections: [...] }` dans `PAGES_CONFIG`.
3. Si la page a un `export const metadata` (composant serveur), garder `page.tsx` serveur et mettre le contenu dans un composant client à côté (voir `app/mentions-legales/`).
4. Ajouter la page dans `PAGES` du test `consistency.test.ts` et dans `app/sitemap.ts`.

## Brouillon / publication

« Enregistrer » dans l'admin écrit un **brouillon** ; rien n'est en ligne tant qu'on ne clique pas sur **Publier**.

| Action | Effet |
|---|---|
| Enregistrer le brouillon | n'écrit que les champs **réellement modifiés** (jamais les textes par défaut) |
| Voir le brouillon / aperçu de l'admin | la page avec `?cms_preview=1` : brouillons par-dessus le publié, réservé aux sessions CMS connectées |
| Publier | recopie les brouillons de la page vers le site public, puis les supprime ; régénère la page (SEO compris) |
| Abandonner | supprime les brouillons ; le site en ligne n'est pas modifié |

**Stockage, sans migration SQL** : un brouillon est une ligne de `site_content` dont `page` vaut `draft:<page>`. Le site public interroge `page = '<page>'` et ne le voit donc jamais.
Logique pure et testée seule : `lib/cms-drafts.ts`. Routes : `PUT /api/cms/content` (`draft: true`), `POST /api/cms/publish` (`publish` | `discard`), `GET /api/cms/public-content?preview=1`.

**Édition en ligne** (bouton « Éditer » sur le site) : même principe. Elle enregistre en brouillon, affiche les brouillons pendant l'édition et propose « Publier ».
Une écriture directe en ligne (sans `draft`) remplace le brouillon du même champ, pour qu'un « Publier » ultérieur n'écrase pas une modification plus récente.

**Repli** : si la base refuse les brouillons (une contrainte CHECK sur `page`, code 23514), l'admin l'affiche et revient à la publication directe, après confirmation.

**Historique** : le déclencheur SQL journalise aussi les lignes `draft:…` ; le panneau d'historique d'une page ne montre que les vraies mises en ligne.

**Cache** : toute écriture **directe** (`PUT /api/cms/content` sans `draft`) appelle `revalidatePath(pagePath(page))`, comme la publication. Sans cela, un texte écrit en direct (édition en ligne, « ↺ Original » de l'onglet Contenu) pouvait rester l'ancien jusqu'à 5 minutes sur un site en cache.

## Trouver et suivre le contenu (onglet 🔎 Contenu)

Une carte de **tous** les textes du site, pour ne plus chercher une phrase page par page.

- Écran : `components/cms/ContentOverview.tsx`. Logique pure : `lib/cms-search.ts`, testée dans `__tests__/lib/cms-search.test.ts`.
- Index construit dans l'admin à partir de `PAGES_CONFIG` (libellés, groupes), de `PAGE_DEFAULTS` (textes d'origine) et des lignes de `site_content` — publiées **et** brouillons (`draft:<page>`). Aucun appel réseau supplémentaire, aucune migration : un champ ajouté à `PAGES_CONFIG` apparaît automatiquement dans l'onglet.
- **Recherche** : insensible à la casse et aux accents (« equipe » trouve « équipe »), dans le libellé, la clé, le nom de la page et la valeur. Seuls les champs `text` / `textarea` / `richtext` / `select` sont fouillés dans leur valeur : les blocs personnalisés et les structures se cherchent par leur **libellé**, sinon les résultats seraient pleins de syntaxe.
- **Cartes des listes** : `buildContentIndex` relit chaque liste **comme la page la lit** (`readList` : JSON enregistré, sinon les anciens champs numérotés) et garde les cartes dans `field.listItems`. La recherche descend donc dans chaque texte de carte (`cardMatches`) et affiche « Programme 1 — Séance découverte · Réponse » avec l'extrait : le JSON lui-même n'est jamais cherché. Une liste trouvée par son libellé annonce simplement « N cartes ».
- **Compteurs** : `contentStats` (textes éditables, personnalisés, en attente de publication, pages avec brouillon) et `pageStats` (page par page). Le badge de l'onglet = nombre de modifications en attente.
- **Personnalisé** = une valeur non vide est enregistrée en base pour ce champ. Une valeur vide retombe sur le texte d'origine : c'est ce qui permet « ↺ Original ».
- **Ouvrir** : `openContentField` bascule sur l'onglet Pages, ouvre le groupe du champ (`labelParts`) et fait défiler jusqu'à `fieldAnchor(page, clé)` = `field-<page>-<clé>` (`scrollMarginTop` compense l'en-tête fixe). Le champ est surligné ~3 s, puis le style disparaît.
- **Publier** depuis cet onglet réutilise `publishPage` (brouillon + publication) ; l'index est mis à jour par `indexPublished` pour que les compteurs suivent sans rechargement.
- **↺ Original** : après confirmation, écrit une valeur **publiée vide** (`PUT /api/cms/content` sans `draft`, qui supprime le brouillon du champ). Le site réaffiche le texte de `lib/cms-defaults`. C'est une modification directe, donc immédiate — pas un brouillon.

### Remplacer un mot dans plusieurs textes

« Renommer partout » sans passer par le code : `planReplacements` (`lib/cms-search.ts`) propose les champs concernés, l'admin les écrit **en brouillon**.

- **Champs concernés** : `text`, `textarea`, `richtext` des pages **et les textes des cartes** (`listItems`). Sont exclus : un `select` (« oui »/« non »), une URL d'image, et les champs marqués `noReplace` dans `LIST_DEFS` — aujourd'hui le lien d'un bouton de carte (`href` : `calendly`, `/booking`…), qui n'est pas du texte à lire.
- **Listes** : la carte n'est pas éditée en place — `planListReplacement` relit les cartes, remplace dans chaque texte, puis réécrit la liste entière en JSON (`serializeList`). Un seul `PUT` par liste, et les champs non textuels (lien, mise en avant, icône, prix) sont recopiés à l'identique. Le détail des textes touchés est porté par `item.cards` (`CardChange`), ce que l'aperçu affiche carte par carte.
- **Correspondance** : insensible à la casse et aux accents, comme la recherche (`fold`). Les espaces comptent : `find` n'est pas `trim()`é, sinon une suppression laisserait une double espace invisible.
- **Majuscule** : si le mot trouvé commence par une majuscule et que le remplacement est en minuscules, la majuscule est reportée (« Organisations » → « Entreprises »). Un remplacement déjà capitalisé est inséré tel quel.
- **Base de départ** : `effectiveValue` (brouillon s'il existe). Un brouillon en attente est donc complété, pas écrasé par l'ancienne version publiée.
- **Écriture** : un `PUT /api/cms/content` avec `draft: true` par champ — rien n'est publié ; l'utilisateur publie ensuite page par page depuis le même onglet. Après l'écriture, `drafts` et `editedContent` sont mis à jour, donc les compteurs et l'aperçu suivent sans rechargement.
- **Garde-fou** : si un des champs concernés a une saisie non enregistrée dans l'onglet Pages (`editedContent` ≠ brouillon/publié), le remplacement est refusé et l'admin demande de l'enregistrer d'abord — il ne doit jamais écraser une frappe en cours.
- Aperçu : nombre de textes / pages / occurrences (`replacementStats`, qui compte les textes de carte comme des textes) et diff ligne par ligne (avant barré, après en vert).
- Un remplacement qui redonne le texte d'origine (`find` = `replacement`) n'apparaît pas : `replaceInText` compte bien l'occurrence, mais `planListReplacement` et `planReplacements` ignorent un texte inchangé.

## Développer sans Supabase

```bash
npm run dev:mock      # faux Supabase en mémoire + site en dev ; admin : /cms-admin, mot de passe « dev-local »
npm test              # tests unitaires et d'intégration (routes API contre le faux Supabase)
```

`scripts/mock-supabase.cjs` imite l'API REST de Supabase (select, upsert, delete, filtres) et le déclencheur d'historique. `/__state` affiche son contenu ; `/__config?rejectDrafts=1` simule une base qui refuse les brouillons.

## Sections réordonnables

Sur 7 pages (Accueil, À propos, Coaching, Organisations, Sparring Partner, Relations, Happiness Design), le groupe **Structure** de l'admin permet de **réordonner et masquer** les sections.
Le bandeau d'ouverture (en haut) et l'appel à l'action final (en bas) sont verrouillés : la page garde toujours un début et une fin cohérents.

- Registre : `PAGE_SECTIONS` dans `lib/cms-sections.ts` (id stable + libellé par section). Logique pure et testée.
- Stockage : un seul champ `sections_layout` (JSON `{"order":[…],"hidden":[…]}`). Vide = ordre d'origine, donc une page jamais modifiée s'affiche à l'identique.
- Il suit le circuit brouillon / publication comme tout autre champ. Un JSON invalide retombe sur l'ordre d'origine.
- Dans la page : les `<section>` de `<main>` sont dans un objet `sections`, et `resolveSections(PAGE_SECTIONS.x, c.sections_layout)` donne l'ordre à rendre.

Pour ajouter une section : l'ajouter à l'objet `sections` de la page ET à `PAGE_SECTIONS`. Pour rendre une nouvelle page réordonnable : l'ajouter à `PAGE_SECTIONS`, un champ `sections_layout` (type `sections`) dans `PAGES_CONFIG`, et la valeur `sections_layout: ''` dans ses défauts.

Limites : on ne peut pas dupliquer une section (chacune lit ses propres champs), et la disposition s'applique après le chargement du contenu, comme tous les textes du CMS (le HTML serveur est dans l'ordre d'origine).

## SEO par page

Chaque page a trois champs, groupe « Référencement Google » : `seo_title`, `seo_description`, `seo_image`.
Ils sont lus côté serveur par `lib/page-seo.ts` (`pageMetadata(page, DEFAULTS)`) dans le `layout.tsx` de la route.
Les valeurs par défaut sont celles de `lib/cms-defaults/<page>.ts` ; si Supabase est indisponible, on les utilise : le SEO ne casse jamais.
Chaque sauvegarde d'un champ `seo_*` régénère la page (`revalidatePath` dans `app/api/cms/content/route.ts`) ; sinon elle se régénère au plus toutes les 5 minutes.
`pageMetadata` définit aussi l'URL canonique et `og:url` **propres à chaque page** (avant, toutes pointaient vers l'accueil).
La page d'accueil utilise les réglages globaux (Paramètres → SEO).

## Sécurité — règles à garder

- **Authentification des routes** : toute route de `app/api/` doit appeler `requireCmsAuth(req)`, OU figurer dans `PUBLIC_ROUTES` de `__tests__/api/cms-protected-routes.test.ts` avec sa raison. Ce test échoue sinon.
- **Session d'édition en ligne** : le cookie `hh_cms_edit` est un jeton **signé** (HMAC, 2 h, httpOnly) émis par `proxy.ts` et vérifié par `verifyEditSession` (`lib/cms-auth.ts`). Ne jamais faire confiance à la simple présence d'un cookie. `hh_cms_ui` n'est qu'un indicateur d'affichage, sans aucun accès.
- **E-mails** : toute valeur saisie par un visiteur passe par `esc()` (`lib/send-email.ts`) avant d'entrer dans un gabarit HTML.
- **Aperçu des brouillons** : `?preview=1` n'est honoré que pour une session CMS authentifiée.
- **Secrets** : jamais dans le code ni dans le dépôt (public). Variables d'environnement uniquement : voir `.env.example`.
- **URL du site** : `lib/site-url.ts` (variable `NEXT_PUBLIC_SITE_URL`) ; ne pas écrire de nom de domaine en dur.

## Pages « transversales » (éléments communs)

- **Textes communs** (page CMS `site`, `lib/cms-defaults/site.ts`) : bandeau cookies, formulaire newsletter, boutons de partage, page 404, page de maintenance.
- **Test d'attachement** (page CMS `test-attachement`, `lib/cms-defaults/test-attachement.ts`) : introduction, boutons, 16 questions, libellés de l'échelle, textes des 4 profils (une ligne par force / vigilance / piste), avertissement, SEO.
  Le code ne garde que la structure (dimension mesurée, sens de la notation) : `lib/attachment-test/questions.ts`, `results-content.ts` et `scoring.ts` lisent leurs textes dans le module de défauts ; `lib/attachment-test/cms.ts` applique les textes du CMS.
- **Espace client** (page CMS `compte`, `lib/cms-defaults/compte.ts`) : `/auth/login`, `/auth/register` et `/dashboard` (bandeau « Espace client », libellés et messages du formulaire, textes du tableau de bord, adresse email de contact).
  Les messages d'erreur affichés par Supabase lui-même restent ceux de Supabase (trop variables pour être réécrits sans risque).
- **Pages rendues côté serveur** (ex. article de blog) : `getPageContent(page, DEFAULTS)` (`lib/cms-content-server.ts`) lit les textes publiés ; les composants « client » utilisent `useCmsContent`.
- ⚠️ Si la base refuse l'enregistrement des pages `site` ou `test-attachement` (erreur « violates check constraint »), une contrainte CHECK limite les noms de page de `site_content` :
  `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'site_content'::regclass and contype = 'c';` puis `alter table site_content drop constraint <nom>;` (ou ajouter ces pages à la liste).

## Menu du site (onglet 🧭 Menu)

- Éditeur : `components/cms/NavigationEditor.tsx`, logique pure dans `lib/cms-nav.ts` (testée).
- Stockage : deux clés de `site_content`, page `navigation` — `nav_items` (JSON des liens) et `nav_locked`.
- **Verrou d'ordre** : `nav_locked = '1'` désactive le glisser-déposer (renommer, masquer, ajouter, supprimer restent possibles). Absent ou `'0'` → menu libre. `isNavLocked()` dans `lib/cms-nav.ts`.
- Le menu s'enregistre **directement** (pas de brouillon) via `PUT /api/cms/navigation`.

## Fil d'Ariane (onglet 🔗 Fil d'Ariane, page CMS « fil-ariane »)

- Rendu par `components/Breadcrumb.tsx`, monté une seule fois dans `components/Header.tsx` : il apparaît donc sur toutes les pages, sauf l'accueil.
- Logique pure : `lib/breadcrumb.ts` (`buildCrumbs`, `isBreadcrumbHidden`, testée). L'adresse des maillons vient du chemin ; le CMS ne fournit que les **libellés** (`bc_<page>`) et l'interrupteur `bc_enabled` (`'0'`/`non`/`false`/`off` = masqué).
- Les adresses techniques n'apparaissent jamais : le préfixe `/p/` des pages libres et `/auth/` sont ignorés, et `ROUTE_LABELS` donne un nom lisible à `/dashboard`, `/auth/login` et `/auth/register`. Un libellé saisi dans le CMS reste prioritaire.
- `bc_enabled` et les libellés suivent le circuit brouillon → publication.
- `app/globals.css` : `.hh-crumb + main { padding-top: 0 }` — quand le fil est affiché, il occupe déjà la place sous l'en-tête fixe (sinon les pages gardent leur `pt-[72px]`).
- Pour ajouter une page au fil : ajouter un champ `bc_<page>` dans `lib/cms-defaults/fil-ariane.ts`, dans `PAGES_CONFIG['fil-ariane']` et dans la table `labels` de `components/Breadcrumb.tsx` (le test de cohérence le vérifie).

## Pages libres (onglet 📄 Pages libres)

Créer des pages entières depuis l'admin : adresse `/p/<slug>`, titre, accroche, blocs et SEO.

- Rendu : `app/p/[slug]/page.tsx` (serveur, `revalidate = 60`), blocs via `CustomBlockView`. Une page hors ligne ou supprimée répond **404**.
- Stockage : **une seule ligne** de `site_content` — page `custom-pages`, bloc `pages` — dont la valeur est le tableau JSON des pages. Aucune migration SQL.
- Code partagé : `lib/custom-pages.ts` (types + helpers purs, testés dans `__tests__/lib/custom-pages.test.ts`) et `lib/custom-pages-server.ts` (lecture serveur).
- Admin : `components/cms/CustomPagesManager.tsx` ; l'éditeur de blocs est partagé avec les pages historiques (`components/cms/CustomSectionsEditor.tsx`).
- Ces pages s'enregistrent **directement** (pas de brouillon) ; l'interrupteur « En ligne » décide de leur visibilité. Elles sont ajoutées au `sitemap.xml` quand elles sont en ligne.
- Le lien de menu correspondant s'ajoute dans l'onglet 🧭 Menu (adresse `/p/<slug>`).
- Pour une nouvelle page « historique » (avec sections réordonnables et brouillon), voir « Ajouter une page » plus haut.

## Réglages globaux (⚙️ Paramètres)

Les valeurs qui ne sont propres à aucune page vivent dans la table `cms_settings_kv` et sont servies au site par `GET /api/cms/public-settings` (lecture côté navigateur : `useSiteSettings()`, côté serveur : `getKvSettings()`).

| Groupe | Clés | Utilisé par |
|---|---|---|
| 🌍 Général | `contact_email` | pied de page, page d'accueil, e-mail de contact du schéma JSON-LD |
| 📅 Réservation (Calendly) | `calendly_base_url`, `calendly_event_*` (5 services) | `hooks/useCalendly.ts` → accueil, coaching, page Réservation, agenda intégré ; `GET /api/calendly/status` vérifie la disponibilité |
| 📧 Emails automatiques | `email_subject_*` | `lib/email-subjects.ts` → e-mails de réservation et de contact |

**Règle** : aucune adresse Calendly, aucun email de contact écrit en dur dans une page. Les valeurs de secours sont centralisées dans `lib/calendly-config.ts`, `lib/site-contact.ts` et `lib/site-social.ts`, et le test `__tests__/cms/no-hardcoded-text.test.ts` échoue si une page en contient une.

`public-settings` complète toujours les clés absentes avec ces valeurs de secours : un bouton de réservation n'est jamais vide, même sur une base neuve. L'agenda Calendly attend l'arrivée des réglages avant de s'afficher (`ready` dans `useCalendly`) : son script lit `data-url` une seule fois, donc le lancer trop tôt l'aurait initialisé sur le compte par défaut.

**Rendez-vous par service : jamais de slug deviné.** Les clés `calendly_event_*` n'ont **aucune valeur de secours** (`CALENDLY_EVENTS_DEFAULT` est vide). Un slug d'événement ne peut pas être deviné, et un slug périmé casse le bouton (« This Calendly URL is not valid »). Sans réglage saisi, le service retombe donc sur l'**agenda du compte** (`calendly_base_url`), ce qui reste un lien valide. Les noms d'exemple vivent dans `CALENDLY_EVENT_SUGGESTIONS` et ne servent que de `placeholder` dans l'admin : ils ne sont jamais envoyés à Calendly.

**Compte sans rendez-vous public : message au visiteur + alerte au CMS.** Un compte Calendly peut exister sans aucun rendez-vous publié : l'agenda intégré affiche alors « No openings at the moment » dans une iframe muette (l'API JS de Calendly n'expose pas ce cas), donc le visiteur croit à une panne. `lib/calendly-availability.ts` (logique pure) interroge l'API publique `calendly.com/api/booking/profiles/<compte>`, qui renvoie `unavailability_reason` dans ce cas. L'appel se fait **côté serveur** (`GET /api/calendly/status`, route publique déclarée dans `__tests__/api/cms-protected-routes.test.ts`) car cette API ne renvoie **aucun en-tête CORS**. Le composant `CalendlyWidget` remplace alors l'agenda par un message (textes `t_aucune_disponibilite_*` de la page « Réservation ») et un lien `mailto:` ; la route dépose en plus une alerte **unread** dans `contact_messages` (`type = 'booking_alert'`, anti-doublon 6 h) et envoie un e-mail à `ADMIN_EMAIL`. Toute réponse inattendue est traitée comme `unknown` : on **ne remplace jamais l'agenda par erreur** — seul un `unavailable` avéré masque l'iframe.

## IA de l'admin (questionnaires, blog, carrousels)

- **Un seul point d'entrée** : `generateText()` dans `lib/ai-text.ts`. Le fournisseur est choisi d'après les variables Vercel, dans cet ordre : `ANTHROPIC_API_KEY` (Claude, payant) → `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Workers AI, gratuit) → `GROQ_API_KEY` (gratuit). Aucun → erreur 503 lisible dans l'admin.
- **Consignes** : `lib/questionnaire-ai.ts` (questionnaires) et `lib/content-ai.ts` (blog, carrousels), écrites pour Happy Humans. Les anciennes consignes « voyage » (ex-Heldonica) ont été retirées.
- **Modèles gratuits moins rigoureux** : `normalizeGeneratedQuestionnaire` répare ce qui peut l'être sans rien inventer (échelle hors limites → 1 à 5, champs sans rapport avec le type, options en double, identifiants). Le reste est refusé par `validateQuestionnaire`, comme une saisie manuelle.
- **Toujours un brouillon** : rien n'est enregistré ni publié par l'IA ; l'admin relit d'abord.
- Le SDK Anthropic n'est chargé que s'il sert (`import()` dynamique) : les routes restent légères sans clé Claude.

## Ce qui n'est PAS dans le CMS

- Les textes de l'interface d'administration elle-même (`/cms-admin`, barre d'édition en ligne, médiathèque).
- Les libellés des `<option>` du formulaire de contact : le texte est la valeur envoyée, il ne faut pas le changer sans adapter le traitement.
- Les articles de blog et destinations : ils ont leur propre éditeur (onglet Articles).
- Le **corps** des e-mails automatiques (`lib/send-email.ts`) : gabarits HTML avec échappement des valeurs saisies ; seuls les objets sont réglables (⚙️ Paramètres → 📧 Emails automatiques).
- Le nom de la marque dans les métadonnées (`Happy Humans` dans `app/layout.tsx` et `lib/page-seo.ts`) : c'est un identifiant technique du site, pas un texte éditorial.
- La navigation : éditeur dédié (onglet 🧭 Menu).
- Les styles et la structure des blocs libres : seuls les textes, images et liens des blocs sont éditables.
- Les anciennes adresses de l'ex-site Heldonica (`/travel-planning`, `/hotel-consulting`, `/destinations/*`…) : les pages ont été supprimées, `next.config.js` redirige les anciens liens.

## Clés d'IA saisies dans l'admin (onglet 🤖 IA)
Fournisseurs : `lib/ai-providers.ts` (catalogue, validation). Choix du fournisseur et appels : `lib/ai-text.ts`. Lecture et écriture des clés : `lib/ai-keys.ts`. Routes : `/api/cms/ai-keys` (état, enregistrement, retrait, fournisseur préféré) et `/api/cms/ai-keys/test`, toutes derrière `requireCmsAuth`.

- **Stockage** : `cms_settings_kv`, clé `secret_ai_<variable>`. La valeur est chiffrée en AES-256-GCM (`lib/secret-box.ts`) avec un secret qui ne vit que dans Vercel : `CMS_SESSION_SECRET`, à défaut `CMS_PASSWORD`. Si ce secret change, les clés enregistrées deviennent illisibles ; l'admin le signale et il suffit de les ressaisir.
- **Jamais renvoyées au navigateur** : `GET /api/cms/ai-keys` ne dit que « configurée / source » (tests : `__tests__/api/cms-ai-keys.test.ts`). La route générique `/api/cms/settings` refuse d'écrire une clé commençant par `secret_` et ne renvoie que les réglages déclarés.
- **Priorité** : une variable Vercel l'emporte sur la valeur de l'admin. `AI_PROVIDER` (Vercel) ou le réglage « fournisseur préféré » désigne le fournisseur à utiliser en priorité ; s'il n'est pas configuré, on retombe sur l'ordre par défaut (Claude, Cloudflare, Groq, Gemini).
- **Ajouter un fournisseur** : une entrée dans `PROVIDERS` (`lib/ai-providers.ts`), son test de disponibilité et son appel dans `lib/ai-text.ts`, puis un test. L'onglet admin se construit tout seul depuis le catalogue.

