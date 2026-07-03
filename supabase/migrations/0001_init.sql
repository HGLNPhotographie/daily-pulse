-- ============================================================================
-- DAILY PULSE — Schéma initial Supabase (PostgreSQL)
-- "Le Rendez-vous Quotidien" — sondage quotidien type Show TV Américain
-- ============================================================================
-- Ce script est idempotent : il peut être rejoué sans casser une base existante.
-- À exécuter dans l'éditeur SQL Supabase, ou via `supabase db push`.
-- ============================================================================

-- Extensions utiles (uuid, planification, crypto)
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ============================================================================
-- 1. TYPES
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vote_choice') then
    create type public.vote_choice as enum ('pour', 'contre', 'neutre');
  end if;

  if not exists (select 1 from pg_type where typname = 'suggestion_status') then
    create type public.suggestion_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- ============================================================================
-- 2. TABLE users (profil applicatif, en 1-1 avec auth.users)
-- ============================================================================

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  pseudo text,
  current_streak integer not null default 0,
  highest_streak integer not null default 0,
  last_vote_date timestamptz,
  push_subscription jsonb,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Profil applicatif enrichi (streak, notifications) lié 1-1 à auth.users';

-- Auto-provisioning d'une ligne public.users à chaque inscription Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- 3. TABLE questions ("Question du Jour")
-- ============================================================================

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text default 'general',
  active_at timestamptz not null,           -- heure d'envoi de la notif / ouverture du vote
  expires_at timestamptz not null,          -- active_at + fenêtre de vote (ex: 5 min)
  total_pour integer not null default 0,
  total_contre integer not null default 0,
  total_neutre integer not null default 0,
  created_at timestamptz not null default now(),
  constraint questions_expires_after_active check (expires_at > active_at)
);

comment on table public.questions is 'Une question par créneau. total_* sont dénormalisés pour un affichage temps réel ultra-rapide.';

create index if not exists idx_questions_active_window
  on public.questions (active_at, expires_at);

-- Une seule question "courante" visible facilement
create or replace view public.current_question as
select *
from public.questions
where active_at <= now()
order by active_at desc
limit 1;

-- ============================================================================
-- 4. TABLE votes
-- ============================================================================

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  choice public.vote_choice not null,
  voted_at timestamptz not null default now(),
  is_in_time boolean not null,
  unique (user_id, question_id) -- 1 seul vote par utilisateur et par question
);

comment on table public.votes is 'is_in_time = voted_at < questions.expires_at, calculé côté serveur, jamais côté client.';

create index if not exists idx_votes_question on public.votes (question_id);
create index if not exists idx_votes_user on public.votes (user_id);

-- ============================================================================
-- 5. TABLE suggestions
-- ============================================================================

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_text text not null check (char_length(question_text) between 5 and 280),
  status public.suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_suggestions_status on public.suggestions (status);

-- ============================================================================
-- 6. TABLE push_subscriptions (Web Push)
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. FONCTION + TRIGGER : logique de vote atomique (streak + compteurs)
-- ============================================================================
-- Toute la logique critique (validité temporelle, incrément de streak,
-- incrément des compteurs agrégés) est faite ICI, côté base, dans une seule
-- transaction verrouillée par ligne. Cela absorbe les pics de charge massifs
-- (des milliers de votes à la seconde où la notif part) sans race condition,
-- sans jamais faire confiance à l'horloge du client.
-- ============================================================================

create or replace function public.cast_vote(
  p_question_id uuid,
  p_choice public.vote_choice
)
returns public.votes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_question public.questions;
  v_now timestamptz := now();
  v_in_time boolean;
  v_vote public.votes;
  v_last_vote_date date;
  v_yesterday date;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Verrouille la ligne question pour sérialiser les incréments concurrents
  select * into v_question
  from public.questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_now < v_question.active_at then
    raise exception 'QUESTION_NOT_ACTIVE_YET' using errcode = 'P0001';
  end if;

  v_in_time := v_now < v_question.expires_at;

  -- Verrouille la ligne utilisateur pour sérialiser la mise à jour du streak
  perform 1 from public.users where id = v_user_id for update;

  insert into public.votes (user_id, question_id, choice, voted_at, is_in_time)
  values (v_user_id, p_question_id, p_choice, v_now, v_in_time)
  returning * into v_vote;

  -- Incrémente le compteur agrégé correspondant (dénormalisé, temps réel)
  if p_choice = 'pour' then
    update public.questions set total_pour = total_pour + 1 where id = p_question_id;
  elsif p_choice = 'contre' then
    update public.questions set total_contre = total_contre + 1 where id = p_question_id;
  else
    update public.questions set total_neutre = total_neutre + 1 where id = p_question_id;
  end if;

  -- Gestion de la Flamme (streak) — uniquement si le vote est dans les temps
  if v_in_time then
    select last_vote_date::date into v_last_vote_date from public.users where id = v_user_id;
    v_yesterday := (v_question.active_at at time zone 'utc')::date - 1;

    update public.users
    set
      current_streak = case
        -- Le jour précédent actif a bien été honoré (ou 1er vote) -> on continue la flamme
        when v_last_vote_date is null or v_last_vote_date >= v_yesterday
          then current_streak + 1
        -- Un ou plusieurs jours ont été ratés -> la flamme repart de 1
        else 1
      end,
      last_vote_date = v_now
    where id = v_user_id;

    update public.users
    set highest_streak = greatest(highest_streak, current_streak)
    where id = v_user_id;
  end if;
  -- Si hors délai : le vote est enregistré (is_in_time = false), le compteur
  -- global est bien crédité, mais current_streak n'est jamais incrémenté.

  return v_vote;
end;
$$;

grant execute on function public.cast_vote(uuid, public.vote_choice) to authenticated;

-- ----------------------------------------------------------------------------
-- 7bis. Trigger de garde-fou : remise à zéro automatique de la flamme si
-- l'utilisateur "rate le coche" (aucun vote dans les temps le jour où une
-- question était active). Exécuté par un cron quotidien (voir section 9).
-- ----------------------------------------------------------------------------

create or replace function public.reset_missed_streaks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users u
  set current_streak = 0
  where u.current_streak > 0
    and (
      u.last_vote_date is null
      or u.last_vote_date::date < (current_date - 1)
    );
end;
$$;

-- ============================================================================
-- 8. FONCTION : résultats agrégés en direct (pour le graphique de tendances)
-- ============================================================================

create or replace function public.get_question_results(p_question_id uuid)
returns table (
  total_votes integer,
  pct_pour numeric,
  pct_contre numeric,
  pct_neutre numeric
)
language sql
stable
as $$
  select
    (total_pour + total_contre + total_neutre) as total_votes,
    case when (total_pour + total_contre + total_neutre) = 0 then 0
      else round(total_pour::numeric * 100 / (total_pour + total_contre + total_neutre), 1)
    end as pct_pour,
    case when (total_pour + total_contre + total_neutre) = 0 then 0
      else round(total_contre::numeric * 100 / (total_pour + total_contre + total_neutre), 1)
    end as pct_contre,
    case when (total_pour + total_contre + total_neutre) = 0 then 0
      else round(total_neutre::numeric * 100 / (total_pour + total_contre + total_neutre), 1)
    end as pct_neutre
  from public.questions
  where id = p_question_id;
$$;

-- ============================================================================
-- 9. PLANIFICATION (pg_cron) — reset quotidien des flammes ratées
-- ============================================================================
-- Ajuster l'heure selon le fuseau de référence de l'app (ici 02:00 UTC).
select cron.schedule(
  'daily-pulse-reset-missed-streaks',
  '0 2 * * *',
  $$ select public.reset_missed_streaks(); $$
) where not exists (
  select 1 from cron.job where jobname = 'daily-pulse-reset-missed-streaks'
);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;
alter table public.suggestions enable row level security;
alter table public.push_subscriptions enable row level security;

-- --- users -------------------------------------------------------------
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Classement public (streak only) : vue dédiée sans données sensibles
create or replace view public.leaderboard as
select id, coalesce(pseudo, 'Joueur') as pseudo, current_streak, highest_streak
from public.users
order by current_streak desc
limit 100;

grant select on public.leaderboard to authenticated, anon;

-- --- questions -----------------------------------------------------------
-- Tout utilisateur authentifié peut lire les questions déjà actives
-- (jamais les questions futures : suspense garanti côté client ET serveur).
drop policy if exists "questions_select_active_or_past" on public.questions;
create policy "questions_select_active_or_past"
  on public.questions for select
  using (active_at <= now());

-- --- votes -----------------------------------------------------------------
drop policy if exists "votes_select_own" on public.votes;
create policy "votes_select_own"
  on public.votes for select
  using (auth.uid() = user_id);

-- Aucun insert/update direct autorisé : tout passe par la fonction sécurisée
-- public.cast_vote() (security definer) afin de garantir l'intégrité du
-- streak et des compteurs, quelle que soit la charge.
drop policy if exists "votes_no_direct_insert" on public.votes;
create policy "votes_no_direct_insert"
  on public.votes for insert
  with check (false);

-- --- suggestions -------------------------------------------------------
drop policy if exists "suggestions_select_own_or_approved" on public.suggestions;
create policy "suggestions_select_own_or_approved"
  on public.suggestions for select
  using (auth.uid() = user_id or status = 'approved');

drop policy if exists "suggestions_insert_own" on public.suggestions;
create policy "suggestions_insert_own"
  on public.suggestions for insert
  with check (auth.uid() = user_id);

-- --- push_subscriptions ----------------------------------------------------
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 11. REALTIME — publication des tables pour les abonnements côté client
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'questions'
  ) then
    alter publication supabase_realtime add table public.questions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;

-- ============================================================================
-- 12. SEED DE DÉMO (facultatif — à retirer en production)
-- ============================================================================

insert into public.questions (text, category, active_at, expires_at)
select
  'Le télétravail devrait-il devenir un droit garanti par la loi ?',
  'société',
  now() - interval '2 minutes',
  now() + interval '3 minutes'
where not exists (select 1 from public.questions where active_at > now() - interval '10 minutes');
