-- ============================================================================
-- DAILY PULSE — Durcissement sécurité (Phase 1)
-- Empêche l'auto-promotion admin et restreint les champs modifiables par
-- l'utilisateur sur son propre profil.
-- ============================================================================

-- Un utilisateur non-admin ne peut pas modifier is_admin (même sur sa ligne).
create or replace function public.protect_users_admin_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor / service role : pas de auth.uid() → bootstrap admin autorisé.
  if auth.uid() is null then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_users_admin_column on public.users;
create trigger protect_users_admin_column
  before update on public.users
  for each row
  execute function public.protect_users_admin_column();

-- Policy explicite : mise à jour du profil sans toucher is_admin.
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

comment on function public.protect_users_admin_column is
  'Bloque toute élévation de privilèges is_admin sauf par un admin existant.';
