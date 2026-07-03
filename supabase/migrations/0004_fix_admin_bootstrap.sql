-- Corrige le trigger : le SQL Editor Supabase n'a pas de auth.uid(),
-- ce qui bloquait silencieusement le premier "update ... set is_admin = true".

create or replace function public.protect_users_admin_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;
