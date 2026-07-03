-- Corrige USER_PROFILE_MISSING pour les votants anonymes / invités.
-- L'insertion ne lit plus auth.users (souvent inaccessible depuis cast_vote).

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  insert into public.users (id)
  values (v_user_id)
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;

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
  v_banned boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Auto-provision du profil (sessions anonymes ou créées avant le trigger auth).
  insert into public.users (id)
  values (v_user_id)
  on conflict (id) do nothing;

  if not exists (select 1 from public.users where id = v_user_id) then
    raise exception 'USER_PROFILE_MISSING' using errcode = 'P0001';
  end if;

  select is_banned into v_banned from public.users where id = v_user_id;
  if v_banned then
    raise exception 'USER_BANNED' using errcode = 'P0001';
  end if;

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

  perform 1 from public.users where id = v_user_id for update;

  insert into public.votes (user_id, question_id, choice, voted_at, is_in_time)
  values (v_user_id, p_question_id, p_choice, v_now, v_in_time)
  returning * into v_vote;

  if p_choice = 'pour' then
    update public.questions set total_pour = total_pour + 1 where id = p_question_id;
  elsif p_choice = 'contre' then
    update public.questions set total_contre = total_contre + 1 where id = p_question_id;
  else
    update public.questions set total_neutre = total_neutre + 1 where id = p_question_id;
  end if;

  if v_in_time then
    select last_vote_date::date into v_last_vote_date from public.users where id = v_user_id;
    v_yesterday := (v_question.active_at at time zone 'utc')::date - 1;

    update public.users
    set
      current_streak = case
        when v_last_vote_date is null or v_last_vote_date >= v_yesterday
          then current_streak + 1
        else 1
      end,
      last_vote_date = v_now
    where id = v_user_id;

    update public.users
    set highest_streak = greatest(highest_streak, current_streak)
    where id = v_user_id;
  end if;

  return v_vote;
end;
$$;

grant execute on function public.cast_vote(uuid, public.vote_choice) to authenticated;
