# Configuration auth — Phase 2 (email + Google + Apple)

## 1. Migration SQL

Dans **SQL Editor**, exécute :

`supabase/migrations/0006_user_profiles.sql`

## 2. URLs de redirection (Supabase)

**Authentication** → **URL Configuration** → **Redirect URLs**, ajoute :

```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

En production, ajoute aussi :

```
https://ton-domaine.vercel.app/auth/callback
```

**Site URL** (même page) : `http://localhost:3000` en dev.

Dans `.env.local` :

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Email + mot de passe

**Authentication** → **Providers** → **Email** :

- Active **Email**
- Pour les tests rapides : désactive **Confirm email** (tu pourras le réactiver en prod)

## 4. Google

### Supabase
**Authentication** → **Providers** → **Google** → Enable  
Copie le **Client ID** et **Client Secret** depuis Google Cloud.

### Google Cloud Console
1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. **OAuth 2.0 Client ID** (type **Web application**)
3. **Authorized redirect URIs** — ajoute l’URL affichée dans Supabase (souvent `https://<ref>.supabase.co/auth/v1/callback`)
4. Colle Client ID + Secret dans Supabase → Save

## 5. Apple

### Supabase
**Authentication** → **Providers** → **Apple** → Enable

### Apple Developer (compte payant 99€/an)
1. [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles
2. Crée un **Services ID** (Sign in with Apple)
3. Configure le domaine et la redirect URL Supabase
4. Crée une **Key** pour Sign in with Apple
5. Renseigne **Services ID**, **Team ID**, **Key ID**, **Private Key** dans Supabase

> Apple Sign-In ne fonctionne qu’en **HTTPS** (prod ou tunnel type ngrok). En local, privilégie Google ou email.

## 6. Tester dans l’app

1. `npm run dev`
2. Onglet **Compte** (`/compte`)
3. **Créer** avec email/mot de passe ou **Google**
4. Choisis un **pseudo** → Enregistrer
5. Vote sur **Le Show** → vérifie **Ma Flamme**

## Comportement

| Situation | Comportement |
|-----------|--------------|
| Invité anonyme → Créer un compte | `updateUser` : **même user_id**, flamme conservée |
| Invité → Google/Apple | `linkIdentity` : flamme conservée |
| Invité → Se connecter (compte existant) | Nouvelle session (compte existant) |

## Dépannage

- **OAuth redirect error** → vérifie Redirect URLs dans Supabase
- **Google invalid_client** → URI de redirection Google = callback Supabase, pas localhost
- **Email non reçu** → désactive Confirm email en dev ou vérifie les spams
