-- Amis, demandes d'amis et confidentialité des votes.

alter table public.users
  add column if not exists votes_private boolean not null default false;

comment on column public.users.votes_private is
  'Si true, les amis ne peuvent pas voir le vote de l''utilisateur.';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'friend_request_status') then
    create type public.friend_request_status as enum ('pending', 'accepted', 'rejected');
  end if;
end $$;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users (id) on delete cascade,
  to_user_id uuid not null references public.users (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (from_user_id <> to_user_id),
  constraint friend_requests_unique_pair unique (from_user_id, to_user_id)
);

create index if not exists idx_friend_requests_to_pending
  on public.friend_requests (to_user_id)
  where status = 'pending';

create index if not exists idx_friend_requests_from
  on public.friend_requests (from_user_id);

create table if not exists public.friendships (
  user_low uuid not null references public.users (id) on delete cascade,
  user_high uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendships_ordered check (user_low < user_high)
);

create index if not exists idx_friendships_user_low on public.friendships (user_low);
create index if not exists idx_friendships_user_high on public.friendships (user_high);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.friendship_pair(a uuid, b uuid)
returns table (user_low uuid, user_high uuid)
language sql
immutable
as $$
  select least(a, b), greatest(a, b);
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.user_low = least(a, b) and f.user_high = greatest(a, b)
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC : envoyer une demande (par id ou pseudo)
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
    if v_existing.status = 'accepted' then
      raise exception 'ALREADY_FRIENDS' using errcode = 'P0001';
    end if;
    update public.friend_requests
    set status = 'pending', updated_at = now()
    where id = v_existing.id;
    return v_existing.id;
  end if;

  -- Demande inverse en attente → accepter automatiquement
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

create or replace function public.send_friend_request_by_pseudo(p_pseudo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_id uuid;
begin
  select id into v_target_id
  from public.users
  where lower(trim(pseudo)) = lower(trim(p_pseudo))
  limit 1;

  if v_target_id is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return public.send_friend_request(v_target_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : répondre à une demande
-- ---------------------------------------------------------------------------

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_req public.friend_requests%rowtype;
  v_pair record;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_req from public.friend_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_req.to_user_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING' using errcode = 'P0001';
  end if;

  if p_accept then
    update public.friend_requests set status = 'accepted', updated_at = now() where id = p_request_id;
    select * into v_pair from public.friendship_pair(v_req.from_user_id, v_req.to_user_id);
    insert into public.friendships (user_low, user_high)
    values (v_pair.user_low, v_pair.user_high)
    on conflict do nothing;
  else
    update public.friend_requests set status = 'rejected', updated_at = now() where id = p_request_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : listes
-- ---------------------------------------------------------------------------

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
  order by fr.created_at desc;
$$;

create or replace function public.count_pending_friend_requests()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.friend_requests
  where to_user_id = auth.uid() and status = 'pending';
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
  where f.user_low = me.id or f.user_high = me.id
  order by u.current_streak desc, u.pseudo asc;
$$;

-- ---------------------------------------------------------------------------
-- RPC : vote du dernier sondage d'un ami
-- ---------------------------------------------------------------------------

create or replace function public.get_friend_last_vote(p_friend_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_friend public.users%rowtype;
  v_question public.questions%rowtype;
  v_vote public.votes%rowtype;
begin
  if v_me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.are_friends(v_me, p_friend_id) then
    raise exception 'NOT_FRIENDS' using errcode = '42501';
  end if;

  select * into v_friend from public.users where id = p_friend_id;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_friend.votes_private then
    return jsonb_build_object(
      'hidden', true,
      'voted', false,
      'choice', null,
      'question_id', null,
      'question_text', null,
      'options', null
    );
  end if;

  select * into v_question
  from public.questions
  where active_at <= now()
  order by active_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'hidden', false,
      'voted', false,
      'choice', null,
      'question_id', null,
      'question_text', null,
      'options', null
    );
  end if;

  select * into v_vote
  from public.votes
  where user_id = p_friend_id and question_id = v_question.id;

  if not found then
    return jsonb_build_object(
      'hidden', false,
      'voted', false,
      'choice', null,
      'question_id', v_question.id,
      'question_text', v_question.text,
      'options', v_question.options
    );
  end if;

  return jsonb_build_object(
    'hidden', false,
    'voted', true,
    'choice', v_vote.choice::text,
    'question_id', v_question.id,
    'question_text', v_question.text,
    'options', v_question.options
  );
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.send_friend_request_by_pseudo(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_incoming_friend_requests() to authenticated;
grant execute on function public.count_pending_friend_requests() to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.get_friend_last_vote(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "friend_requests_select_own" on public.friend_requests;
create policy "friend_requests_select_own"
  on public.friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
  on public.friendships for select
  using (auth.uid() = user_low or auth.uid() = user_high);
