-- Supprime tous les comptes invités (anonymous) déjà créés.
-- Les visiteurs pourront toujours obtenir une nouvelle session invitée à la prochaine visite.
-- À exécuter dans l'éditeur SQL Supabase (rôle postgres).

delete from auth.users
where coalesce(is_anonymous, false) = true
   or coalesce(raw_app_meta_data->>'provider', '') = 'anonymous';
