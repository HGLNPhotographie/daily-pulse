-- Suppression d'amis et blocage.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id);

comment on table public.user_blocks is
  'Blocage unidirectionnel : le bloqueur ne voit plus l''utilisateur et ce dernier ne peut plus l''ajouter.';

create or replace function public.is_user_blocked(p_viewer uuid, p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = p_viewer and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = p_viewer)
  );
$$;

create or replace function public.remove_friendship_between(a uuid, b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where user_low = least(a, b) and user_high = greatest(a, b);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : retirer ou bloquer un ami
-- ---------------------------------------------------------------------------

create or replace function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_friend_id = v_me then
    raise exception 'FRIEND_SELF' using errcode = 'P0001';
  end if;

  if not public.are_friends(v_me, p_friend_id) then
    raise exception 'NOT_FRIENDS' using errcode = 'P0001';
  end if;

  perform public.remove_friendship_between(v_me, p_friend_id);

  update public.friend_requests
  set status = 'rejected', updated_at = now()
  where status in ('pending', 'accepted')
    and (
      (from_user_id = v_me and to_user_id = p_friend_id)
      or (from_user_id = p_friend_id and to_user_id = v_me)
    );
end;
$$;

create or replace function public.block_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_friend_id = v_me then
    raise exception 'FRIEND_SELF' using errcode = 'P0001';
  end if;

  perform public.remove_friendship_between(v_me, p_friend_id);

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, p_friend_id)
  on conflict do nothing;

  update public.friend_requests
  set status = 'rejected', updated_at = now()
  where status = 'pending'
    and (
      (from_user_id = v_me and to_user_id = p_friend_id)
      or (from_user_id = p_friend_id and to_user_id = v_me)
    );
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_friend(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Mise à jour des RPC existantes (blocage)
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target public.users%rowtype;
  v_existing public.friend_requests%rowtype;
  v_pair record;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_target_user_id = v_me then
    raise exception 'FRIEND_SELF' using errcode = 'P0001';
  end if;

  if public.is_user_blocked(v_me, p_target_user_id) then
    raise exception 'USER_BLOCKED' using errcode = 'P0001';
  end if;

  select * into v_target from public.users where id = p_target_user_id;
  if not found or v_target.pseudo is null or trim(v_target.pseudo) = '' then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if public.are_friends(v_me, p_target_user_id) then
    raise exception 'ALREADY_FRIENDS' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.friend_requests
  where from_user_id = v_me and to_user_id = p_target_user_id;

  if found then
    if v_existing.status = 'pending' then
      return v_existing.id;
    end if;
    if v_existing.status = 'accepted' and public.are_friends(v_me, p_target_user_id) then
      raise exception 'ALREADY_FRIENDS' using errcode = 'P0001';
    end if;
    update public.friend_requests
    set status = 'pending', updated_at = now()
    where id = v_existing.id;
    return v_existing.id;
  end if;

  select * into v_existing
  from public.friend_requests
  where from_user_id = p_target_user_id and to_user_id = v_me and status = 'pending';

  if found then
    update public.friend_requests
    set status = 'accepted', updated_at = now()
    where id = v_existing.id;

    select * into v_pair from public.friendship_pair(v_me, p_target_user_id);
    insert into public.friendships (user_low, user_high)
    values (v_pair.user_low, v_pair.user_high)
    on conflict do nothing;

    return v_existing.id;
  end if;

  insert into public.friend_requests (from_user_id, to_user_id)
  values (v_me, p_target_user_id)
  returning id into v_existing.id;

  return v_existing.id;
end;
$$;

create or replace function public.list_friends()
returns table (
  friend_id uuid,
  pseudo text,
  current_streak integer,
  highest_streak integer
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id)
  select
    case when f.user_low = me.id then f.user_high else f.user_low end as friend_id,
    u.pseudo,
    u.current_streak,
    u.highest_streak
  from public.friendships f
  cross join me
  join public.users u on u.id = case when f.user_low = me.id then f.user_high else f.user_low end
  where (f.user_low = me.id or f.user_high = me.id)
    and not public.is_user_blocked(
      me.id,
      case when f.user_low = me.id then f.user_high else f.user_low end
    )
  order by u.current_streak desc, u.pseudo asc;
$$;

create or replace function public.list_incoming_friend_requests()
returns table (
  id uuid,
  from_user_id uuid,
  from_pseudo text,
  from_streak integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fr.id,
    fr.from_user_id,
    u.pseudo as from_pseudo,
    u.current_streak as from_streak,
    fr.created_at
  from public.friend_requests fr
  join public.users u on u.id = fr.from_user_id
  where fr.to_user_id = auth.uid()
    and fr.status = 'pending'
    and not public.is_user_blocked(auth.uid(), fr.from_user_id)
  order by fr.created_at desc;
$$;

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);
