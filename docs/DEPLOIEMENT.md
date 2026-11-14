# Mise en ligne — checklist

Deux branches, **dans cet ordre**.

| Ordre | Branche | Contenu | Pourquoi |
|---|---|---|---|
| **1** | `hotfix/securite` | Correctif de sécurité seul, basé sur `main` (Next 14) | La faille est exploitable **aujourd'hui** ; ce correctif est petit et déjà vérifié sur la stack actuelle |
| **2** | `feat/stack-et-cms-complet` | Next 16, CMS complet, brouillons, sections, SEO | Plus gros : à valider sur un aperçu Vercel avant de passer en production |

La branche 2 **contient déjà** le correctif de la branche 1 (elle a été fusionnée avec) : après avoir déployé la branche 1, fusionner la branche 2 ne produit aucun conflit.

## 0. La faille corrigée par `hotfix/securite`

Avant, le cookie `hh_cms_edit` valait simplement `1` et le serveur lui faisait confiance : **n'importe quel visiteur** pouvait le fabriquer dans son navigateur pour écrire du contenu en ligne et lire les réservations, messages de contact et réglages. S'y ajoutaient un relais d'e-mails ouvert (`/api/send-email`), la publication Instagram et la génération IA sans authentification, et des e-mails de confirmation qui insèrent tel quel le texte saisi (liens d'hameçonnage).

**Après le déploiement du correctif**
1. Vérifier que la faille est fermée (doit répondre `401`) :
   ```bash
   curl -i -X PUT https://VOTRE-SITE/api/cms/content \
     -H "Content-Type: application/json" -H "Cookie: hh_cms_edit=1" \
     -d '{"page":"coaching","block_key":"hero_title","value":"test"}'
   curl -i -X POST https://VOTRE-SITE/api/send-email -H "Content-Type: application/json" -d '{}'
   ```
2. Se reconnecter à `/cms-admin`, puis utiliser « Éditer le site » : les anciens cookies `1` ne fonctionnent plus (c'est voulu).
3. **Par prudence, supposer que la faille a pu être exploitée** : relire les derniers contenus du site (l'historique de chaque page est dans l'admin), vérifier le mode maintenance, les articles et les réglages, et regarder les e-mails envoyés dans Brevo.
4. Changer `CMS_PASSWORD`, `CMS_SESSION_SECRET` et `CMS_HMAC_SECRET` si un doute subsiste.

## Accéder à l'administration

- **Adresse** : `https://happyhumans.vercel.app/cms-admin` (puis le bouton « ✏️ Éditer le site » pour modifier directement les pages).
- **Mot de passe** : la valeur de la variable `CMS_PASSWORD` dans **Vercel → le projet → Settings → Environment Variables** (icône œil pour l'afficher). Il n'est ni dans le dépôt ni dans le code.
- **Le changer** : modifier `CMS_PASSWORD` dans Vercel, puis **Deployments → Redeploy** (une variable modifiée ne s'applique qu'à un nouveau déploiement). Changer le mot de passe ou `CMS_SESSION_SECRET` déconnecte les sessions en cours.
- En local, le mot de passe est dans `.env.local` (jamais commité) ; avec `npm run dev:mock` (faux Supabase), c'est `dev-local`. Ces deux mots de passe ne valent pas pour le site en ligne.
- Message « CMS non configuré : variable CMS_PASSWORD manquante » : la variable est absente ou vide dans le déploiement. Message « Mot de passe incorrect » : ce n'est pas la valeur de `CMS_PASSWORD` du déploiement en cours (si elle vient d'être modifiée, il faut redéployer). `CMS_SESSION_SECRET` est facultatif : sans lui, les sessions sont signées avec le mot de passe.

## Démarrage rapide (le minimum, en 3 étapes)

**1. Coller les variables dans Vercel en une seule fois.**
Vercel → projet → Settings → Environment Variables → **Import .env** (ou coller directement plusieurs lignes dans le premier champ « Key »). Collez ce bloc rempli, en cochant *Production* et *Preview* :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
CMS_PASSWORD=un-mot-de-passe-long-d-au-moins-12-caracteres
```

Où trouver les trois clés Supabase : Supabase → projet → **Settings → API** (adresse, clé « publishable », clé « secret »).
Ces 4 variables suffisent pour démarrer : tout le reste est facultatif et se règle plus tard (voir `.env.example`).
Pour le lancement, ajoutez aussi `NEXT_PUBLIC_SITE_URL` (adresse définitive, sans slash final) et, si vous voulez le générateur de questionnaires, `ANTHROPIC_API_KEY`.

**2. Créer les tables.** Supabase → **SQL Editor** → coller et exécuter les migrations de `supabase/migrations/` (celle des questionnaires : `20261102000000_questionnaires.sql`).

**3. Redéployer, puis vérifier.** Vercel → Deployments → ⋮ → Redeploy. Ouvrez ensuite `/cms-admin` : le **tableau de bord** affiche en haut tout ce qui ne va pas (variable absente ou mal copiée, table manquante, données privées lisibles par un visiteur), avec *ce qu'il faut faire*. S'il n'affiche aucun problème, la configuration technique est bonne. Le contrôle est refait toutes les 10 minutes (code : `lib/env-check.ts`).

## 1. Avant de déployer la branche 2

### Variables d'environnement
Voir `.env.example` (à jour, avec obligatoire / recommandé / optionnel). À vérifier dans Vercel → Settings → Environment Variables :

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CMS_PASSWORD`, `CMS_SESSION_SECRET`, `CMS_HMAC_SECRET` (valeurs longues, aléatoires, distinctes)
- [ ] `BREVO_API_KEY`, `SENDER_EMAIL`, `ADMIN_EMAIL` : sans eux les e-mails de confirmation ne partent pas (silencieusement)
- [ ] `NEXT_PUBLIC_SITE_URL` : facultative (voir « Nom de domaine » ci-dessous)

### Nom de domaine — décidé : `https://happyhumans.vercel.app`
C'est l'adresse par défaut de tout le site : accueil, `robots.txt`, sitemap, **articles de blog** (qui déclaraient avant `happyhumans.fr`) et liens des e-mails. Aucune variable n'est nécessaire.
Si un nom de domaine personnalisé est branché un jour, renseigner `NEXT_PUBLIC_SITE_URL` aligne tout le site d'un coup (`lib/site-url.ts`).
⚠️ Plusieurs images sont encore servies depuis l'ancien site WordPress (`https://happyhumans.fr/wp-content/uploads/…`, dans `lib/wordpress-data.ts` et `lib/instagram-static.ts`) : elles disparaîtront si ce domaine cesse de les héberger.

### Supabase
- [ ] La table `site_content` existe (elle n'est **pas** dans `supabase/migrations`, elle a été créée à la main) avec la contrainte unique `(page, block_key)`.
- [ ] Les migrations de `supabase/migrations/` sont appliquées, notamment `20260711000000_content_history.sql` (historique des modifications).
- [ ] Le bucket de stockage `cms-assets` existe et est public (sinon : admin → route `/api/cms/setup-storage`).
- [ ] **Aucune migration à exécuter pour cette mise à jour** : les brouillons sont stockés dans `site_content` sous `page = 'draft:<page>'`. Si une contrainte `CHECK` sur `page` les refusait, l'admin l'affiche et revient à la publication directe.

### Vercel
- [ ] Node **≥ 20.9** (requis par Next 16 ; Vercel utilise 22 par défaut — Settings → General → Node.js Version).
- [ ] Commande de build : `npm run build` (déjà dans `vercel.json`). Le cron `/api/keep-alive` (tous les jours à 08:00) garde la base Supabase active.
- [ ] Le verrouillage `package-lock.json` a été régénéré avec npm 11 ; vérifié : `npm ci` fonctionne avec le npm 10 de Vercel.

### Aperçu (Preview) : attention à la base de données
Pousser une branche crée un aperçu Vercel. **S'il utilise la même base Supabase que la production, tout ce que vous faites dans l'admin de l'aperçu modifie le vrai site.** Utiliser de préférence un projet Supabase de test pour les variables « Preview », ou n'essayer que le brouillon (rien n'est publié sans clic sur « Publier »).

## 2. Plan de test sur l'aperçu

Dans l'ordre ; chaque ligne doit réussir.

**Sécurité**
- [ ] La commande `curl` du §0 répond `401`.
- [ ] Un visiteur non connecté, sur `/coaching?cms_preview=1`, voit la version publiée (jamais le brouillon).

**Éditeur (admin → Pages)**
- [ ] Modifier un titre → « Enregistrer le brouillon » → le site public est inchangé, l'aperçu montre le brouillon.
- [ ] « Publier » → le site public est à jour. « Abandonner » sur un autre brouillon → rien ne change en ligne.
- [ ] Groupe **Structure** : réordonner et masquer une section → aperçu → publier → visible côté visiteur ; le bandeau d'ouverture et l'appel final restent à leur place.
- [ ] Groupe **Référencement Google** : changer le titre → `view-source:` de la page → `<title>`, `canonical`, `og:title` à jour.
- [ ] FAQ : modifier, supprimer (champ vide) et ajouter une question.
- [ ] Édition en ligne (« Éditer le site ») : modifier un texte → « Enregistrer le brouillon » → « Publier ».

**Site public**
- [ ] Formulaire de contact et de réservation : l'e-mail de confirmation arrive, et un nom contenant `<b>test</b>` apparaît tel quel (pas en gras).
- [ ] `/sitemap.xml` et `/robots.txt` : adresses correctes (`NEXT_PUBLIC_SITE_URL`), plus de `/temoignages`.
- [ ] Blog : liste et un article ; calendrier de réservation ; bandeau cookies.
- [ ] Mode maintenance (admin → Paramètres) : activé, un visiteur voit la page de maintenance, vous (connectée) accédez au site.

## 3. Mise en production et retour arrière

1. Fusionner la branche 2 dans `main` (déploiement automatique si Vercel est relié à `main`).
2. **Retour arrière immédiat** : Vercel → Deployments → déploiement précédent → « Promote to Production » (instantané, sans rebuild).
3. Les données sont compatibles dans les deux sens : les lignes `draft:*` et les nouveaux champs (`sections_layout`, `seo_*`, `t_*`…) sont simplement ignorés par l'ancienne version.

## 4. Après la mise en ligne

- [ ] Search Console : les URL canoniques changent (chaque page a désormais la sienne au lieu de l'accueil) ; inspecter quelques URL et **soumettre à nouveau le sitemap**.
- [ ] Lire `docs/CMS_ARCHITECTURE.md` avant d'ajouter un texte, une page ou une section.

## 5. Restes connus (non traités)

- **Anti-spam** : `/api/contact`, `/api/booking` et la connexion `/api/cms/auth` n'ont ni limitation de débit, ni captcha. Un formulaire public peut servir à envoyer des e-mails de confirmation à des tiers. À traiter au niveau de l'infrastructure (Vercel Firewall / Upstash) ou avec un captcha (Turnstile).
- 7 failles de développement (`npm audit`) liées à Tailwind 3 : sans effet en production ; seule la migration vers Tailwind 4 les corrige.
- `ignoreBuildErrors: true` dans `next.config.js` : le build ignore les erreurs de typage. Le typecheck est propre : on peut le passer à `false`.
- Code mort : `components/HomeClient.tsx`, `MiniFooter`, `MiniNav`, `app/middleware.ts`, `lib/db.ts`, `lib/mongodb.ts`, `models/` (jamais importés).
- Les pages `/travel-planning`, `/hotel-consulting`, `/destinations/*`… sont redirigées par `next.config.js` : leur code n'est pas servi.
