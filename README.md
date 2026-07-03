# 📺 Daily Pulse — Le Rendez-vous Quotidien

PWA de sondage quotidien interactif à la direction artistique "Show TV Américain" : une question par jour, une fenêtre de 5 minutes pour voter (Pour / Contre / Neutre), une flamme (streak) à ne pas casser, des résultats en temps réel dignes d'un plateau télé.

## ✨ Stack

- **Next.js 16 (App Router)** + TypeScript + Tailwind CSS v4
- **Framer Motion** — rideau théâtral, countdown, transitions
- **canvas-confetti** — célébrations de vote / streak
- **shadcn/ui** + **Recharts** — UI et graphiques de tendances
- **Supabase** (PostgreSQL, Auth, Realtime) — backend
- **PWA** — `manifest.json` + `public/sw.js` (cache app-shell + Web Push)

## 🚀 Démarrage rapide (mode démo, sans backend)

```bash
npm install
npm run dev
```

Tant que les variables Supabase ne sont pas renseignées, l'app tourne en **mode démo** : la question du jour, les votes et les compteurs sont simulés en `localStorage`, avec de "faux" votants qui arrivent en continu pour animer le graphique de tendances. Idéal pour tester tout le parcours (rideau, countdown, vote, flamme, résultats) immédiatement.

## 🗄️ Brancher Supabase (production)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL, exécute `supabase/migrations/0001_init.sql` (tables, RLS, triggers, fonctions, realtime).
3. Copie `.env.example` vers `.env.local` et renseigne :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (routes API serveur uniquement)
4. (Optionnel) Web Push : génère des clés VAPID avec `npx web-push generate-vapid-keys`, renseigne `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `CRON_SECRET`.
5. Planifie l'appel quotidien à `/api/cron/notify` (Vercel Cron, Supabase Edge Function, ou pg_cron+pg_net) à un horaire aléatoire dans ta fenêtre cible (ex: entre 12h et 20h).

## 📂 Structure du projet

```
src/
├─ app/
│  ├─ page.tsx                 # Écran principal : Le Rendez-vous du jour
│  ├─ layout.tsx                # Layout racine (fonts, thème dark, PWA, nav)
│  ├─ globals.css               # Thème "Show TV" néon (variables, utilitaires)
│  ├─ streak/page.tsx           # Détail de la Flamme + paliers
│  ├─ suggestions/page.tsx      # Proposer une question du jour
│  ├─ admin/                    # 🛠️ Espace administrateur (voir plus bas)
│  │  ├─ layout.tsx                # Garde d'accès (is_admin) + sidebar
│  │  ├─ page.tsx                  # Dashboard : question live, envoi rapide
│  │  ├─ questions/page.tsx        # Publier / planifier / notifier
│  │  ├─ suggestions/page.tsx      # Modération des suggestions
│  │  └─ users/page.tsx            # Liste des profils utilisateurs
│  └─ api/
│     ├─ push/subscribe/route.ts   # Enregistrement des abonnements Web Push
│     ├─ cron/notify/route.ts      # Déclenché par le scheduler externe
│     └─ admin/notify-now/route.ts # Envoi manuel déclenché depuis /admin
│
├─ components/
│  ├─ curtain/CurtainReveal.tsx    # 🎭 Rideau théâtral d'ouverture
│  ├─ flame/StreakFlame.tsx        # 🔥 Flamme animée (streak)
│  ├─ vote/
│  │  ├─ DailyPollCard.tsx         # Orchestrateur principal du sondage
│  │  ├─ CountdownShowTV.tsx       # Compte à rebours façon jeu télévisé
│  │  ├─ VoteButtons.tsx           # Boutons Pour / Contre / Neutre
│  │  └─ TrendChart.tsx            # Révélation des résultats (Recharts)
│  ├─ admin/                       # Formulaire de question, sidebar, login
│  ├─ layout/
│  │  ├─ BottomNav.tsx
│  │  └─ ServiceWorkerRegister.tsx
│  └─ ui/                          # Composants shadcn/ui
│
├─ hooks/
│  ├─ useDailyQuestion.ts       # State machine du vote (démo ou Supabase)
│  ├─ useAdminSession.ts        # Garde d'accès admin (login + is_admin)
│  ├─ useCountdown.ts
│  ├─ useNowTick.ts
│  └─ useCountUp.ts
│
├─ lib/
│  ├─ supabase/{client,server}.ts
│  ├─ constants.ts              # Palette néon, paliers de streak, durée du vote
│  ├─ demo.ts                   # Simulateur "mode démo" (localStorage)
│  ├─ admin-api.ts              # Publier/planifier une question, notifier
│  └─ push.ts                   # Abonnement Web Push côté client
│
└─ types/index.ts

supabase/
└─ migrations/0001_init.sql     # Schéma complet (tables, RLS, triggers, cron)

public/
├─ manifest.json
├─ sw.js
└─ icons/                       # Icônes PWA (générées depuis l'identité visuelle)
```

## 📱 Applications mobiles iOS & Android (Capacitor)

Le projet est packagé nativement via [Capacitor](https://capacitorjs.com/) : **tout le code de `src/` reste inchangé**, l'app Next.js est simplement chargée dans une WebView native distribuable sur l'App Store et le Play Store.

Comme l'app utilise de vraies routes API (`/api/admin/notify-now`, `/api/cron/notify`, Supabase Realtime...), elle ne peut pas être exportée en HTML statique : Capacitor charge donc l'app depuis son **URL déployée** (`capacitor.config.ts` → `server.url`), au lieu d'embarquer un export statique.

### Structure ajoutée

```
capacitor.config.ts   # appId, appName, couleurs, server.url
assets/                # icon.png (1024×1024) + splash.png source, utilisés par @capacitor/assets
ios/                   # Projet Xcode natif (Swift Package Manager, pas de CocoaPods)
android/               # Projet Android Studio natif (Gradle)
```

### Prérequis locaux

- **iOS** : Xcode complet installé (pas seulement les Command Line Tools) — `xcode-select -p` doit pointer vers `/Applications/Xcode.app/...`.
- **Android** : Android Studio (fournit le SDK, `adb`, un JDK).

### Mettre à jour l'app native après un changement de code

1. Déploie l'app Next.js (Vercel ou autre) pour obtenir une URL publique.
2. Renseigne cette URL dans l'environnement avant de synchroniser :
   ```bash
   CAPACITOR_SERVER_URL=https://ton-app.vercel.app npm run cap:sync
   ```
3. Ouvre le projet natif et build/run depuis l'IDE :
   ```bash
   npm run cap:open:ios       # ouvre Xcode
   npm run cap:open:android   # ouvre Android Studio
   ```

### Tester en local sur simulateur/appareil (live-reload)

```bash
npm run dev                                    # démarre Next.js sur ton réseau local
CAPACITOR_SERVER_URL=http://<IP-locale>:3000 npm run cap:sync
npm run cap:run:ios       # ou cap:run:android
```

⚠️ Utilise l'IP locale de ta machine (`ipconfig getifaddr en0` sur Mac), jamais `localhost`, pour que le simulateur/appareil puisse joindre ton serveur de dev.

### Régénérer les icônes / splash screens

Remplace `assets/icon.png` (1024×1024) et/ou `assets/splash.png` (carré, haute résolution) puis :

```bash
npm run cap:assets
npm run cap:sync
```

### Fonctionnalités natives déjà branchées

- **Haptics** : `src/lib/capacitor.ts` → `triggerHaptic()` utilise le plugin natif `@capacitor/haptics` sur mobile, et retombe sur l'API `navigator.vibrate` en PWA/navigateur — même appel partout (`VoteButtons.tsx`).
- **Splash screen & barre de statut** : gérés par `CapacitorBootstrap.tsx` (masque le splash une fois l'UI prête, colore la status bar en accord avec le thème sombre).
- **Bouton retour Android** : quitte proprement l'app plutôt que d'afficher un écran blanc en bout de pile de navigation.
- **Service Worker** : désactivé automatiquement en contexte natif (`ServiceWorkerRegister.tsx`) — inutile puisque l'app est déjà un binaire installé.

### Pistes pour aller plus loin

- **Notifications push natives** : actuellement l'app utilise le Web Push standard (VAPID). Pour de vraies notifications natives iOS/Android (plus fiables, sans dépendre de Safari/Chrome en arrière-plan), il faudrait ajouter `@capacitor/push-notifications` + un projet Firebase (Android/FCM) et un certificat APNs (iOS), puis stocker les tokens natifs dans une nouvelle colonne à côté de `push_subscriptions`.
- **Auto-update de l'UI sans repasser par les stores** : possible via [Capgo](https://capgo.app/) ou un OTA update Capacitor, pour pousser les changements de `src/` sans re-soumission App Store à chaque fois (comme c'est déjà le cas ici puisque l'app charge une URL distante — un simple redéploiement suffit, sans même passer par les stores).

## 🛠️ Espace administrateur (`/admin`)

Un panneau caché (pas de lien depuis la nav publique) permet à l'équipe éditoriale de :

- **Dashboard** : voir la question en cours et ses résultats en direct, envoyer la notification "C'est l'heure du Rendez-vous" à la demande.
- **Questions** : publier une question immédiatement ou la planifier à un horaire futur, consulter l'historique.
- **Suggestions** : approuver, rejeter ou publier directement une suggestion envoyée par les utilisateurs.
- **Utilisateurs** : consulter tous les profils (streak, record, dernier vote) et gérer les droits admin.

**Mode démo** : `/admin` est accessible sans connexion (bandeau "Démo"), avec des utilisateurs fictifs.

**Mode Supabase** : l'accès nécessite un compte réel avec `is_admin = true`. Après avoir créé ton compte via Supabase Auth (email/mot de passe — voir le SQL Editor ou le dashboard Supabase Auth), exécute :

```sql
update public.users set is_admin = true where email = 'toi@exemple.com';
```

La sécurité repose entièrement sur la RLS (`supabase/migrations/0002_admin.sql`) : chaque action (publier une question, modérer une suggestion, lire tous les profils) est vérifiée côté base via `public.is_admin()`, jamais uniquement côté client. L'envoi de notifications passe par une route serveur (`/api/admin/notify-now`) qui revérifie la session et le rôle avant d'utiliser la clé `service_role`.

## 🔥 Logique du streak (Flamme)

Toute la logique critique vit **côté base de données** dans la fonction `public.cast_vote()` (`security definer`), appelée via `supabase.rpc("cast_vote", ...)` :

- Verrouille la ligne `questions` (`FOR UPDATE`) pour absorber les pics de charge à la seconde où la notification part, sans race condition sur les compteurs agrégés.
- Calcule `is_in_time` côté serveur (`voted_at < expires_at`), jamais côté client.
- Incrémente `current_streak` uniquement si le vote est dans les temps **et** que le jour précédent actif a été honoré ; sinon la flamme repart à 1.
- Un job `pg_cron` quotidien (`reset_missed_streaks`) remet à zéro les flammes des utilisateurs n'ayant pas voté à temps.

Le score n'est jamais basé sur l'opinion votée : voter "Contre" une majorité écrasante de "Pour" incrémente la flamme exactement pareil.
