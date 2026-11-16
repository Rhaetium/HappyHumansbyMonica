# 🎯 Configuration du CMS Happy Humans

## Problème actuel

Le CMS affiche : **"CMS non configuré : variable CMS_PASSWORD manquante"**

## Solution : Configurer CMS_PASSWORD sur Vercel

### Étape 1 : Générer un mot de passe sécurisé

```bash
# Option 1 : Utiliser OpenSSL
openssl rand -base64 32

# Option 2 : Utiliser Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Étape 2 : Ajouter la variable sur Vercel

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner le projet **Happyhumans**
3. Cliquer sur **Settings** (Paramètres)
4. Dans le menu latéral, cliquer sur **Environment Variables**
5. Cliquer **Add New** et configurer :

| Nom | Valeur | Environnements |
|-----|--------|---------------|
| `CMS_PASSWORD` | `votre-mot-de-passe-securise` | Production, Preview, Development |

6. Cliquer **Save**

### Étape 3 : Redéployer

1. Aller dans **Deployments**
2. Cliquer sur **Redeploy** sur le dernier déploiement (icône ⋮ → Redeploy)

---

## Accéder au CMS

1. Aller sur l'adresse du site suivie de `/cms-admin`
2. Entrer le mot de passe configuré
3. Vous êtes connecté pour 8 heures

---

## Variables d'environnement optionnelles

| Variable | Description | Par défaut |
|----------|-------------|------------|
| `CMS_PASSWORD` | Mot de passe obligatoire pour accéder au CMS | **Requis** |
| `CMS_SESSION_SECRET` | Clé pour les sessions | Utilise CMS_PASSWORD |

---

## Dépannage

### "CMS non configuré" après configuration

1. ✅ Vérifier que la variable est bien définie dans Vercel
2. ✅ Vérifier qu'il n'y a pas d'espace avant/après le mot de passe
3. ✅ Redeployer après modification
4. ✅ Vérifier que "Environments" inclut bien "Production"

### Mot de passe oublié

1. Se connecter au dashboard Vercel
2. Modifier la variable `CMS_PASSWORD`
3. Redeployer

---

## Sécurité

- Le mot de passe est stocké uniquement côté serveur
- Les sessions expirent après 8 heures
- Aucune donnée sensible n'est exposée au client
- Utiliser un mot de passe long et aléatoire
