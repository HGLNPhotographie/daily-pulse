-- Inscription : pseudo unique, date de naissance (16+), tranche d'âge dérivée.

alter table public.users
  add column if not exists birth_date date;

comment on column public.users.birth_date is
  'Date de naissance (privée). Seul le titulaire la lit ; l''admin voit uniquement age_range.';

alter table public.users drop constraint if exists users_age_range_check;

alter table public.users
  add constraint users_age_range_check check (
    age_range is null
    or age_range in ('16-17', '18-24', '25-34', '35-44', '45-54', '55+')
  );

create unique index if not exists users_pseudo_unique_idx
  on public.users (lower(trim(pseudo)))
  where pseudo is not null and trim(pseudo) <> '';

create or replace function public.age_range_from_birth(p_birth_date date)
returns text
language plpgsql
immutable
as $$
declare
  v_age integer;
begin
  if p_birth_date is null or p_birth_date > current_date then
    return null;
  end if;

  v_age := date_part('year', age(current_date, p_birth_date))::integer;

  return case
    when v_age < 16 then null
    when v_age < 18 then '16-17'
    when v_age < 25 then '18-24'
    when v_age < 35 then '25-34'
    when v_age < 45 then '35-44'
    when v_age < 55 then '45-54'
    else '55+'
  end;
end;
$$;

create or replace function public.complete_signup_profile(
  p_pseudo text,
  p_birth_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pseudo text;
  v_age integer;
  v_range text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  v_pseudo := trim(p_pseudo);
  if v_pseudo is null or length(v_pseudo) < 2 or length(v_pseudo) > 24 then
    raise exception 'PSEUDO_INVALID' using errcode = 'P0001';
  end if;

  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'BIRTH_DATE_INVALID' using errcode = 'P0001';
  end if;

  v_age := date_part('year', age(current_date, p_birth_date))::integer;
  if v_age < 16 then
    raise exception 'AGE_MINIMUM' using errcode = 'P0001';
  end if;

  v_range := public.age_range_from_birth(p_birth_date);
  if v_range is null then
    raise exception 'AGE_MINIMUM' using errcode = 'P0001';
  end if;

  insert into public.users (id, pseudo, birth_date, age_range, profile_completed_at)
  values (v_user_id, v_pseudo, p_birth_date, v_range, now())
  on conflict (id) do update
  set
    pseudo = excluded.pseudo,
    birth_date = excluded.birth_date,
    age_range = excluded.age_range,
    profile_completed_at = excluded.profile_completed_at;

exception
  when unique_violation then
    raise exception 'PSEUDO_TAKEN' using errcode = '23505';
end;
$$;

grant execute on function public.complete_signup_profile(text, date) to authenticated;

-- Vue admin : pas de date de naissance.
create or replace view public.admin_user_directory as
select
  id,
  email,
  pseudo,
  age_range,
  gender,
  current_streak,
  highest_streak,
  last_vote_date,
  is_admin,
  is_banned,
  banned_at,
  profile_completed_at,
  created_at
from public.users;

grant select on public.admin_user_directory to authenticated;
