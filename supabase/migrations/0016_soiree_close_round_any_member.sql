-- Permet à tout joueur de clôturer la manche une fois le timer écoulé
-- (l'hôte seul peut lancer la manche suivante via soiree_next_round).

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
  perform public.soiree_assert_member(p_party_id, p_player_id, p_session_secret);
  select * into v_party from public.soiree_parties where id = p_party_id for update;

  if v_party.status = 'results' and v_party.current_question_id is not null then
    return public.soiree_build_round_results(v_party.current_question_id);
  end if;

  if v_party.status <> 'playing' then
    raise exception 'SOIREE_ROUND_CLOSED';
  end if;

  if v_party.current_question_id is null then
    raise exception 'SOIREE_NO_ACTIVE_ROUND';
  end if;

  if v_party.round_ends_at is not null and v_party.round_ends_at > now() then
    raise exception 'SOIREE_ROUND_NOT_EXPIRED';
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
