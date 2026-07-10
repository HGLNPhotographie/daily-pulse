-- Mode Soirée : parties privées, questions anonymes, votes en temps réel.

-- ---------------------------------------------------------------------------
-- Abonnement (V1 : tout le monde en free, prêt pour Stripe)
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists subscription_tier text not null default 'free';

alter table public.users
  drop constraint if exists users_subscription_tier_check;

alter table public.users
  add constraint users_subscription_tier_check
  check (subscription_tier in ('free', 'pro'));

comment on column public.users.subscription_tier is
  'free = 5 joueurs / 5 questions ; pro = 20 joueurs / 15 questions par joueur.';

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'soiree_party_status') then
    create type public.soiree_party_status as enum (
      'lobby',
      'writing',
      'playing',
      'results',
      'finished',
      'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'soiree_question_type') then
    create type public.soiree_question_type as enum (
      'member_pick',
      'finger_point',
      'pour_contre'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'soiree_question_status') then
    create type public.soiree_question_status as enum ('pending', 'drawn', 'done');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.soiree_parties (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.users (id) on delete cascade,
  join_code text not null unique,
  status public.soiree_party_status not null default 'lobby',
  answer_seconds integer not null default 10,
  max_players integer not null,
  max_questions_per_player integer not null,
  tier text not null default 'free',
  current_question_id uuid,
  round_ends_at timestamptz,
  created_at timestamptz not null default now(),
  lobby_expires_at timestamptz not null,
  started_at timestamptz,
  finished_at timestamptz,
  constraint soiree_parties_answer_seconds check (answer_seconds between 5 and 15),
  constraint soiree_parties_tier check (tier in ('free', 'pro'))
);

create index if not exists idx_soiree_parties_host on public.soiree_parties (host_user_id);
create index if not exists idx_soiree_parties_status on public.soiree_parties (status);
create index if not exists idx_soiree_parties_join_code on public.soiree_parties (join_code);

create table if not exists public.soiree_players (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.soiree_parties (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  pseudo text not null,
  is_host boolean not null default false,
  session_secret uuid not null default gen_random_uuid(),
  writing_done boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint soiree_players_pseudo_len check (char_length(trim(pseudo)) between 2 and 24),
  constraint soiree_players_unique_pseudo unique (party_id, pseudo)
);

create index if not exists idx_soiree_players_party on public.soiree_players (party_id);
create index if not exists idx_soiree_players_user on public.soiree_players (user_id);

create table if not exists public.soiree_questions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.soiree_parties (id) on delete cascade,
  author_player_id uuid not null references public.soiree_players (id) on delete cascade,
  question_type public.soiree_question_type not null,
  text text not null,
  label_pour text,
  label_contre text,
  status public.soiree_question_status not null default 'pending',
  created_at timestamptz not null default now(),
  drawn_at timestamptz,
  constraint soiree_questions_text_len check (char_length(trim(text)) between 3 and 280),
  constraint soiree_questions_pour_contre_labels check (
    question_type <> 'pour_contre'
    or (label_pour is not null and label_contre is not null)
  )
);

create index if not exists idx_soiree_questions_party on public.soiree_questions (party_id);
create index if not exists idx_soiree_questions_pending
  on public.soiree_questions (party_id)
  where status = 'pending';

alter table public.soiree_parties
  drop constraint if exists soiree_parties_current_question_fkey;

alter table public.soiree_parties
  add constraint soiree_parties_current_question_fkey
  foreign key (current_question_id) references public.soiree_questions (id) on delete set null;

create table if not exists public.soiree_votes (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.soiree_parties (id) on delete cascade,
  question_id uuid not null references public.soiree_questions (id) on delete cascade,
  voter_player_id uuid not null references public.soiree_players (id) on delete cascade,
  target_player_id uuid references public.soiree_players (id) on delete cascade,
  choice public.vote_choice,
  submitted_at timestamptz not null default now(),
  constraint soiree_votes_unique_voter unique (question_id, voter_player_id),
  constraint soiree_votes_choice_or_target check (
    (choice is not null and target_player_id is null)
    or (choice is null and target_player_id is not null)
  )
);

create index if not exists idx_soiree_votes_question on public.soiree_votes (question_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.generate_soiree_join_code()
returns text
language plpgsql
volatile
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
  attempts integer := 0;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
  exit when not exists (select 1 from public.soiree_parties p where p.join_code = result);
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'JOIN_CODE_FAILED';
    end if;
  end loop;
  return result;
end;
$$;

create or replace function public.soiree_tier_limits(p_tier text)
returns table (max_players integer, max_questions_per_player integer)
language sql
immutable
as $$
  select
    case when p_tier = 'pro' then 20 else 5 end,
    case when p_tier = 'pro' then 15 else 5 end;
$$;

create or replace function public.auth_is_anonymous()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create or replace function public.soiree_get_player(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns public.soiree_players
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.soiree_players
  where party_id = p_party_id
    and id = p_player_id
    and session_secret = p_session_secret;
$$;

create or replace function public.soiree_assert_member(p_party_id uuid, p_player_id uuid, p_session_secret uuid)
returns public.soiree_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
begin
  select * into v_player
  from public.soiree_get_player(p_party_id, p_player_id, p_session_secret);
  if v_player.id is null then
    raise exception 'SOIREE_PLAYER_INVALID';
  end if;
  update public.soiree_players
  set last_seen_at = now()
  where id = v_player.id;
  return v_player;
end;
$$;

create or replace function public.soiree_assert_host(p_party_id uuid, p_player_id uuid, p_session_secret uuid)
returns public.soiree_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
begin
  v_player := public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  if not v_player.is_host then
    raise exception 'SOIREE_HOST_REQUIRED';
  end if;
  return v_player;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : créer une partie (compte non invité uniquement)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_create_party(p_answer_seconds integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier text;
  v_limits record;
  v_party public.soiree_parties;
  v_player public.soiree_players;
  v_seconds integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if public.auth_is_anonymous() then
    raise exception 'SOIREE_HOST_ACCOUNT_REQUIRED';
  end if;

  v_seconds := greatest(5, least(15, coalesce(p_answer_seconds, 10)));

  select coalesce(u.subscription_tier, 'free') into v_tier
  from public.users u where u.id = v_uid;

  select * into v_limits from public.soiree_tier_limits(v_tier);

  insert into public.soiree_parties (
    host_user_id,
    join_code,
    answer_seconds,
    max_players,
    max_questions_per_player,
    tier,
    lobby_expires_at
  )
  values (
    v_uid,
    public.generate_soiree_join_code(),
    v_seconds,
    v_limits.max_players,
    v_limits.max_questions_per_player,
    v_tier,
    now() + interval '15 minutes'
  )
  returning * into v_party;

  insert into public.soiree_players (party_id, user_id, pseudo, is_host)
  values (
    v_party.id,
    v_uid,
    coalesce((select pseudo from public.users where id = v_uid), 'Hôte'),
    true
  )
  returning * into v_player;

  return jsonb_build_object(
    'party_id', v_party.id,
    'join_code', v_party.join_code,
    'player_id', v_player.id,
    'session_secret', v_player.session_secret,
    'answer_seconds', v_party.answer_seconds,
    'max_players', v_party.max_players,
    'max_questions_per_player', v_party.max_questions_per_player,
    'tier', v_party.tier
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : rejoindre une partie
-- ---------------------------------------------------------------------------

create or replace function public.soiree_join_party(
  p_join_code text,
  p_pseudo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_party public.soiree_parties;
  v_player public.soiree_players;
  v_pseudo text := trim(p_pseudo);
  v_count integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_pseudo) < 2 or char_length(v_pseudo) > 24 then
    raise exception 'SOIREE_PSEUDO_INVALID';
  end if;

  select * into v_party
  from public.soiree_parties
  where join_code = upper(trim(p_join_code))
  for update;

  if v_party.id is null then
    raise exception 'SOIREE_PARTY_NOT_FOUND';
  end if;
  if v_party.status <> 'lobby' then
    raise exception 'SOIREE_PARTY_ALREADY_STARTED';
  end if;
  if v_party.lobby_expires_at < now() then
    update public.soiree_parties set status = 'expired' where id = v_party.id;
    raise exception 'SOIREE_PARTY_EXPIRED';
  end if;

  select count(*) into v_count from public.soiree_players where party_id = v_party.id;
  if v_count >= v_party.max_players then
    raise exception 'SOIREE_PARTY_FULL';
  end if;

  if exists (select 1 from public.soiree_players where party_id = v_party.id and user_id = v_uid) then
    select * into v_player
    from public.soiree_players
    where party_id = v_party.id and user_id = v_uid;
  else
    insert into public.soiree_players (party_id, user_id, pseudo, is_host)
    values (v_party.id, v_uid, v_pseudo, false)
    returning * into v_player;
  end if;

  return jsonb_build_object(
    'party_id', v_party.id,
    'join_code', v_party.join_code,
    'player_id', v_player.id,
    'session_secret', v_player.session_secret,
    'pseudo', v_player.pseudo,
    'is_host', v_player.is_host
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : reconnecter un joueur
-- ---------------------------------------------------------------------------

create or replace function public.soiree_reconnect_player(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
  v_party public.soiree_parties;
begin
  v_player := public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id;
  if v_party.status = 'expired' or (v_party.status = 'lobby' and v_party.lobby_expires_at < now()) then
    raise exception 'SOIREE_PARTY_EXPIRED';
  end if;
  return jsonb_build_object(
    'party_id', v_party.id,
    'player_id', v_player.id,
    'pseudo', v_player.pseudo,
    'is_host', v_player.is_host,
    'party_status', v_party.status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : démarrer la rédaction (hôte)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_start_writing(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party public.soiree_parties;
begin
  perform public.soiree_assert_host(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id for update;
  if v_party.status <> 'lobby' then
    raise exception 'SOIREE_INVALID_STATUS';
  end if;
  if v_party.lobby_expires_at < now() then
    update public.soiree_parties set status = 'expired' where id = p_party_id;
    raise exception 'SOIREE_PARTY_EXPIRED';
  end if;
  update public.soiree_parties
  set status = 'writing', started_at = now(), lobby_expires_at = now()
  where id = p_party_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : soumettre une question
-- ---------------------------------------------------------------------------

create or replace function public.soiree_submit_question(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid,
  p_question_type public.soiree_question_type,
  p_text text,
  p_label_pour text default null,
  p_label_contre text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
  v_party public.soiree_parties;
  v_count integer;
  v_question_id uuid;
begin
  v_player := public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id;
  if v_party.status <> 'writing' then
    raise exception 'SOIREE_INVALID_STATUS';
  end if;

  select count(*) into v_count
  from public.soiree_questions q
  where q.party_id = p_party_id and q.author_player_id = v_player.id;

  if v_count >= v_party.max_questions_per_player then
    raise exception 'SOIREE_QUESTION_LIMIT';
  end if;

  insert into public.soiree_questions (
    party_id,
    author_player_id,
    question_type,
    text,
    label_pour,
    label_contre
  )
  values (
    p_party_id,
    v_player.id,
    p_question_type,
    trim(p_text),
    nullif(trim(p_label_pour), ''),
    nullif(trim(p_label_contre), '')
  )
  returning id into v_question_id;

  return v_question_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : terminer la rédaction (joueur)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_mark_writing_done(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
begin
  v_player := public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  update public.soiree_players set writing_done = true where id = v_player.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : lancer les manches (hôte)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_start_game(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party public.soiree_parties;
  v_q_count integer;
  v_pending integer;
begin
  perform public.soiree_assert_host(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id for update;
  if v_party.status <> 'writing' then
    raise exception 'SOIREE_INVALID_STATUS';
  end if;

  select count(*) into v_q_count from public.soiree_questions where party_id = p_party_id;
  if v_q_count < 1 then
    raise exception 'SOIREE_NO_QUESTIONS';
  end if;

  if exists (
    select 1 from public.soiree_players
    where party_id = p_party_id and not writing_done
  ) then
    raise exception 'SOIREE_PLAYERS_NOT_READY';
  end if;

  update public.soiree_parties set status = 'playing' where id = p_party_id;
  perform public.soiree_draw_question(p_party_id, p_player_id, p_session_secret);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : tirer une question au hasard
-- ---------------------------------------------------------------------------

create or replace function public.soiree_draw_question(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party public.soiree_parties;
  v_question_id uuid;
begin
  perform public.soiree_assert_host(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id for update;

  if v_party.status not in ('playing', 'results') then
    raise exception 'SOIREE_INVALID_STATUS';
  end if;

  select q.id into v_question_id
  from public.soiree_questions q
  where q.party_id = p_party_id and q.status = 'pending'
  order by random()
  limit 1;

  if v_question_id is null then
    update public.soiree_parties
    set status = 'finished', finished_at = now(), current_question_id = null, round_ends_at = null
    where id = p_party_id;
    return null;
  end if;

  update public.soiree_questions
  set status = 'drawn', drawn_at = now()
  where id = v_question_id;

  update public.soiree_parties
  set
    status = 'playing',
    current_question_id = v_question_id,
    round_ends_at = now() + make_interval(secs => v_party.answer_seconds)
  where id = p_party_id;

  return v_question_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : voter
-- ---------------------------------------------------------------------------

create or replace function public.soiree_cast_vote(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid,
  p_question_id uuid,
  p_target_player_id uuid default null,
  p_choice public.vote_choice default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.soiree_players;
  v_party public.soiree_parties;
  v_question public.soiree_questions;
begin
  v_player := public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id;
  select * into v_question from public.soiree_questions where id = p_question_id and party_id = p_party_id;

  if v_question.id is null or v_party.current_question_id <> p_question_id then
    raise exception 'SOIREE_QUESTION_NOT_ACTIVE';
  end if;
  if v_party.round_ends_at is null or now() > v_party.round_ends_at then
    raise exception 'SOIREE_ROUND_CLOSED';
  end if;

  if v_question.question_type = 'pour_contre' then
    if p_choice not in ('pour', 'contre') or p_target_player_id is not null then
      raise exception 'SOIREE_VOTE_INVALID';
    end if;
  else
    if p_target_player_id is null or p_choice is not null then
      raise exception 'SOIREE_VOTE_INVALID';
    end if;
    if p_target_player_id = v_player.id then
      raise exception 'SOIREE_VOTE_SELF';
    end if;
    if not exists (
      select 1 from public.soiree_players sp
      where sp.id = p_target_player_id and sp.party_id = p_party_id
    ) then
      raise exception 'SOIREE_TARGET_INVALID';
    end if;
  end if;

  insert into public.soiree_votes (party_id, question_id, voter_player_id, target_player_id, choice)
  values (p_party_id, p_question_id, v_player.id, p_target_player_id, p_choice)
  on conflict (question_id, voter_player_id) do update
  set target_player_id = excluded.target_player_id,
      choice = excluded.choice,
      submitted_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : clôturer une manche et afficher les résultats
-- ---------------------------------------------------------------------------

create or replace function public.soiree_close_round(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party public.soiree_parties;
  v_question public.soiree_questions;
  v_results jsonb;
begin
  perform public.soiree_assert_host(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id for update;
  if v_party.current_question_id is null then
    raise exception 'SOIREE_NO_ACTIVE_ROUND';
  end if;

  select * into v_question from public.soiree_questions where id = v_party.current_question_id;

  v_results := public.soiree_build_round_results(v_question.id);

  update public.soiree_questions set status = 'done' where id = v_question.id;
  update public.soiree_parties
  set status = 'results', round_ends_at = null
  where id = p_party_id;

  return v_results;
end;
$$;

create or replace function public.soiree_build_round_results(p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_question public.soiree_questions;
  v_podium jsonb;
  v_finger jsonb;
  v_pour integer;
  v_contre integer;
begin
  select * into v_question from public.soiree_questions where id = p_question_id;

  if v_question.question_type = 'pour_contre' then
    select
      count(*) filter (where choice = 'pour'),
      count(*) filter (where choice = 'contre')
    into v_pour, v_contre
    from public.soiree_votes where question_id = p_question_id;

    return jsonb_build_object(
      'question_id', p_question_id,
      'question_type', v_question.question_type,
      'text', v_question.text,
      'label_pour', v_question.label_pour,
      'label_contre', v_question.label_contre,
      'anonymous', true,
      'pour', v_pour,
      'contre', v_contre
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.vote_count desc), '[]'::jsonb)
  into v_podium
  from (
    select sp.pseudo, sp.id as player_id, count(*)::integer as vote_count
    from public.soiree_votes v
    join public.soiree_players sp on sp.id = v.target_player_id
    where v.question_id = p_question_id and v.target_player_id is not null
    group by sp.id, sp.pseudo
    order by vote_count desc
    limit 3
  ) t;

  if v_question.question_type = 'finger_point' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'from_pseudo', vp.pseudo,
      'to_pseudo', tp.pseudo
    )), '[]'::jsonb)
    into v_finger
    from public.soiree_votes v
    join public.soiree_players vp on vp.id = v.voter_player_id
    join public.soiree_players tp on tp.id = v.target_player_id
    where v.question_id = p_question_id;
  else
    v_finger := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'question_id', p_question_id,
    'question_type', v_question.question_type,
    'text', v_question.text,
    'anonymous', v_question.question_type = 'member_pick',
    'podium', v_podium,
    'finger_votes', v_finger
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : manche suivante
-- ---------------------------------------------------------------------------

create or replace function public.soiree_next_round(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  perform public.soiree_assert_host(p_party_id, p_player_id, p_session_secret);
  v_next := public.soiree_draw_question(p_party_id, p_player_id, p_session_secret);
  return jsonb_build_object('question_id', v_next, 'finished', v_next is null);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC : lire les résultats de la manche en cours (tous les joueurs)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_get_round_results(
  p_party_id uuid,
  p_player_id uuid,
  p_session_secret uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_party public.soiree_parties;
  v_question_id uuid;
begin
  perform public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id;
  if v_party.status <> 'results' then
    return null;
  end if;
  select q.id into v_question_id
  from public.soiree_questions q
  where q.party_id = p_party_id and q.status = 'done'
  order by q.drawn_at desc nulls last
  limit 1;
  if v_question_id is null then
    return null;
  end if;
  return public.soiree_build_round_results(v_question_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Vues client (sans auteur des questions)
-- ---------------------------------------------------------------------------

create or replace view public.soiree_questions_public
with (security_invoker = false)
as
select
  q.id,
  q.party_id,
  q.question_type,
  q.text,
  q.label_pour,
  q.label_contre,
  q.status,
  q.created_at,
  q.drawn_at
from public.soiree_questions q;

create or replace view public.soiree_players_public
with (security_invoker = false)
as
select
  p.id,
  p.party_id,
  p.pseudo,
  p.is_host,
  p.writing_done,
  p.joined_at
from public.soiree_players p;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.soiree_parties enable row level security;
alter table public.soiree_players enable row level security;
alter table public.soiree_questions enable row level security;
alter table public.soiree_votes enable row level security;

create or replace function public.is_soiree_party_member(p_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.soiree_players sp
    where sp.party_id = p_party_id and sp.user_id = auth.uid()
  );
$$;

drop policy if exists soiree_parties_select_member on public.soiree_parties;
create policy soiree_parties_select_member on public.soiree_parties
  for select to authenticated
  using (public.is_soiree_party_member(id));

drop policy if exists soiree_players_select_member on public.soiree_players;
create policy soiree_players_select_member on public.soiree_players
  for select to authenticated
  using (public.is_soiree_party_member(party_id));

drop policy if exists soiree_questions_select_member on public.soiree_questions;
create policy soiree_questions_select_member on public.soiree_questions
  for select to authenticated
  using (
    public.is_soiree_party_member(party_id)
    and status in ('drawn', 'done')
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.soiree_parties;
    alter publication supabase_realtime add table public.soiree_players;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Nettoyage : parties terminées / expirées (à appeler via cron)
-- ---------------------------------------------------------------------------

create or replace function public.soiree_cleanup_stale_parties()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select id from public.soiree_parties
    where status in ('finished', 'expired')
       or (status = 'lobby' and lobby_expires_at < now())
  )
  delete from public.soiree_parties p
  using doomed d
  where p.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
