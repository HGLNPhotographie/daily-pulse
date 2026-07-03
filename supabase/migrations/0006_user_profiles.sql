-- ============================================================================
-- DAILY PULSE — Phase 2 : profils utilisateurs
-- ============================================================================

alter table public.users
  add column if not exists age_range text check (
    age_range is null or age_range in ('18-24', '25-34', '35-44', '45-54', '55+')
  ),
  add column if not exists gender text check (
    gender is null or gender in ('female', 'male', 'other', 'prefer_not')
  ),
  add column if not exists profile_completed_at timestamptz;

comment on column public.users.age_range is 'Tranche d''âge (optionnelle, stats agrégées).';
comment on column public.users.gender is 'Genre déclaré (optionnel).';

-- Synchronise l'email public.users quand auth.users est mis à jour
-- (conversion anonyme → compte email, OAuth, etc.).
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_updated();
