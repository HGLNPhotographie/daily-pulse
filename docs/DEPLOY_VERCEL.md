# Déploiement Vercel — Daily Pulse

## Prérequis

- Compte [Vercel](https://vercel.com) (gratuit suffit pour démarrer)
- Compte [GitHub](https://github.com) pour connecter le dépôt
- Projet Supabase configuré (migrations `0001` → `0006` exécutées)
- Build local OK : `npm run build`

## 1. Pousser le code sur GitHub

Le projet n’est pas encore un dépôt git. Depuis le dossier du projet :

```bash
cd "/Volumes/T7/Projet application"
git init
git add .
git commit -m "Initial commit — Daily Pulse MVP"
```

Crée un dépôt vide sur GitHub (sans README), puis :

```bash
git remote add origin https://github.com/TON-USER/daily-pulse.git
git branch -M main
git push -u origin main
```

## 2. Importer sur Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Sélectionne le dépôt `daily-pulse`
3. Framework : **Next.js** (détecté automatiquement)
4. **Ne déploie pas tout de suite** — configure d’abord les variables d’environnement (étape 3)

## 3. Variables d’environnement Vercel

Dans **Settings → Environment Variables**, ajoute pour **Production** (et Preview si tu veux) :

| Variable | Valeur | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Dashboard Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publishable/anon | Côté client |
| `SUPABASE_SERVICE_ROLE_KEY` | clé secret service_role | **Jamais** côté client |
| `NEXT_PUBLIC_SITE_URL` | `https://ton-app.vercel.app` | URL finale Vercel (sans `/` final) |
| `CRON_SECRET` | chaîne aléatoire longue | `openssl rand -base64 32` |

### Web Push (optionnel — pour les notifs navigateur)

```bash
npx web-push generate-vapid-keys
```

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | clé publique VAPID |
| `VAPID_PRIVATE_KEY` | clé privée VAPID |

Sans VAPID, le cron `/api/cron/notify` renverra une erreur 500 — l’app fonctionne quand même ; tu peux notifier manuellement depuis `/admin`.

Clique **Deploy**.

## 4. Mettre à jour Supabase (auth)

Une fois l’URL Vercel connue (ex. `https://daily-pulse-xxx.vercel.app`) :

**Authentication → URL Configuration**

- **Site URL** : `https://ton-app.vercel.app`
- **Redirect URLs** — ajoute :
  ```
  https://ton-app.vercel.app/auth/callback
  ```

## 5. Cron quotidien (notifications)

Le fichier `vercel.json` configure un cron Vercel :

- **Chemin** : `/api/cron/notify`
- **Horaire** : `0 16 * * *` (16:00 **UTC** = 18:00 Paris en été)

Vercel envoie un `GET` avec `Authorization: Bearer <CRON_SECRET>` — la variable `CRON_SECRET` doit être identique à celle définie dans Vercel.

Pour changer l’horaire, édite `vercel.json` → `schedule` (syntaxe cron, **UTC**).

> **Plan Hobby** : 2 crons max, 1 exécution/jour chacun. Pour une heure « surprise » vraiment aléatoire, utilise le bouton **Notifier maintenant** dans `/admin` après avoir publié la question.

## 6. Vérifications post-déploiement

1. Ouvre `https://ton-app.vercel.app` → vote, flamme, compte
2. `/admin` → connexion admin → publier une question
3. Pop-up « nouvelle question » sur toutes les pages
4. (Si VAPID) abonne-toi aux notifs push puis teste **Notifier maintenant**

## 7. Capacitor (apps iOS/Android)

Après déploiement :

```bash
CAPACITOR_SERVER_URL=https://ton-app.vercel.app npm run cap:sync
npm run cap:open:ios   # ou cap:open:android
```

## Dépannage

| Problème | Solution |
|----------|----------|
| Build échoue sur Vercel | Lance `npm run build` en local, corrige les erreurs |
| Vote / auth ne marche pas | Vérifie les 3 clés Supabase + Anonymous Sign-Ins activé |
| OAuth / callback erreur | `NEXT_PUBLIC_SITE_URL` + Redirect URLs Supabase |
| Cron 401 | `CRON_SECRET` identique partout ; redéploie après ajout |
| Cron 500 VAPID | Ajoute les clés VAPID ou désactive le cron temporairement |
| Admin inaccessible | `update public.users set is_admin = true where email = '...'` |

## Commandes utiles

```bash
# Déploiement via CLI (alternative à GitHub)
npx vercel login
npx vercel --prod

# Tester le cron manuellement (remplace URL et secret)
curl -X POST https://ton-app.vercel.app/api/cron/notify \
  -H "x-cron-secret: TON_CRON_SECRET"
```
