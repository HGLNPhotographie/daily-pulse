# Configuration Supabase — Phase 1

Guide pour brancher **Daily Pulse** sur un vrai backend (auth, votes, admin sécurisé).

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Note l’**URL** et la clé **anon** (Project Settings → API)
3. Note la clé **service_role** (serveur uniquement, ne jamais exposer côté client)

## 2. Exécuter les migrations SQL

Dans **SQL Editor** de Supabase, exécute **dans l’ordre** :

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_admin.sql`
3. `supabase/migrations/0003_security.sql`

Ou avec la CLI Supabase : `supabase db push`

## 3. Activer l’auth anonyme (votants)

**Authentication → Providers → Anonymous Sign-Ins** → **Enable**

Les utilisateurs reçoivent automatiquement un `user_id` stable à l’ouverture de l’app (sans inscription).

## 4. Créer le compte administrateur

1. **Authentication → Users → Add user** (email + mot de passe)
2. Dans **SQL Editor**, promouvoir ce compte :

```sql
update public.users
set is_admin = true
where email = 'ton@email.com';
```

> Aucune interface ne permet de s’auto-promouvoir admin (trigger + RLS).

## 5. Variables d’environnement

Copie `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Renseigne au minimum :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Redémarre le serveur : `npm run dev`

## 6. Vérifications

| Test | Résultat attendu |
|------|------------------|
| `/` sans `.env` | Mode démo (local) |
| `/` avec Supabase | Vote via `cast_vote` + Realtime |
| `/admin` sans login | Formulaire email / mot de passe |
| `/admin` compte non-admin | Écran « Accès refusé » |
| `/admin` compte admin | Dashboard complet |
| `/api/demo/*` avec Supabase | 404 (désactivé) |

## 7. Web Push (optionnel, phase ultérieure)

```bash
npx web-push generate-vapid-keys
```

Ajoute les clés dans `.env.local` + configure `CRON_SECRET` pour `/api/cron/notify`.

## Dépannage

- **« Accès refusé » après login** → vérifie le SQL `is_admin = true` sur `public.users`
- **Vote impossible** → active Anonymous Sign-Ins
- **Admin en démo en prod** → impossible si `NEXT_PUBLIC_SUPABASE_*` est défini
- **Erreur RLS** → rejoue les migrations 0002 et 0003
