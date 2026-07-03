-- ============================================================================
-- DAILY PULSE — Mode Administrateur
-- Ajoute un rôle admin (public.users.is_admin) et les policies RLS associées
-- pour : publier/planifier des questions, modérer les suggestions, consulter
-- tous les profils utilisateurs et déclencher l'envoi des notifications.
-- ============================================================================

-- ============================================================================
-- 1. Rôle admin
-- ============================================================================

alter table public.users
  add column if not exists is_admin boolean not null default false;

-- Fonction "security definer" : contourne volontairement la RLS de la table
-- users pour lire le flag is_admin sans provoquer de récursion de policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- 2. Policies RLS additionnelles pour les admins
-- ============================================================================
-- Les policies RLS d'une même commande (select/insert/update/delete) sont
-- combinées en OR : ces policies s'ajoutent à celles définies dans
-- 0001_init.sql sans les remplacer.

-- --- questions : publier, planifier, modifier, supprimer -------------------
drop policy if exists "questions_admin_select_all" on public.questions;
create policy "questions_admin_select_all"
  on public.questions for select
  using (public.is_admin());

drop policy if exists "questions_admin_insert" on public.questions;
create policy "questions_admin_insert"
  on public.questions for insert
  with check (public.is_admin());

drop policy if exists "questions_admin_update" on public.questions;
create policy "questions_admin_update"
  on public.questions for update
  using (public.is_admin());

drop policy if exists "questions_admin_delete" on public.questions;
create policy "questions_admin_delete"
  on public.questions for delete
  using (public.is_admin());

-- --- suggestions : voir toutes les propositions, approuver / rejeter -------
drop policy if exists "suggestions_admin_select_all" on public.suggestions;
create policy "suggestions_admin_select_all"
  on public.suggestions for select
  using (public.is_admin());

drop policy if exists "suggestions_admin_update" on public.suggestions;
create policy "suggestions_admin_update"
  on public.suggestions for update
  using (public.is_admin());

-- --- users : consulter tous les profils, gérer les droits admin -----------
drop policy if exists "users_admin_select_all" on public.users;
create policy "users_admin_select_all"
  on public.users for select
  using (public.is_admin());

drop policy if exists "users_admin_update_all" on public.users;
create policy "users_admin_update_all"
  on public.users for update
  using (public.is_admin());

-- --- votes : lecture globale pour les stats du dashboard admin -------------
drop policy if exists "votes_admin_select_all" on public.votes;
create policy "votes_admin_select_all"
  on public.votes for select
  using (public.is_admin());

-- --- push_subscriptions : compter les abonnés actifs -----------------------
drop policy if exists "push_subscriptions_admin_select_all" on public.push_subscriptions;
create policy "push_subscriptions_admin_select_all"
  on public.push_subscriptions for select
  using (public.is_admin());

-- ============================================================================
-- 3. Vue pratique : file d'attente de modération
-- ============================================================================

create or replace view public.pending_suggestions as
select s.*, u.pseudo as author_pseudo, u.email as author_email
from public.suggestions s
join public.users u on u.id = s.user_id
where s.status = 'pending'
order by s.created_at asc;

-- ============================================================================
-- 4. Promouvoir le premier compte admin
-- ============================================================================
-- Aucune interface ne permet de s'auto-promouvoir admin (sécurité). Après
-- avoir créé ton compte via l'app (Supabase Auth), exécute manuellement :
--
--   update public.users set is_admin = true where email = 'toi@exemple.com';
