"use client";

import { ensureVoterSession, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatSoireeError } from "@/lib/soiree/api";
import type { SoireeQuestionType, SoireeRoundResults } from "@/types/soiree";
import type { VoteChoice } from "@/types";

export interface RpcSession {
  partyId: string;
  playerId: string;
  sessionSecret: string;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Client indisponible.");
  await ensureVoterSession(supabase);
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(formatSoireeError(error.message));
  return data as T;
}

export async function createSoireeParty(answerSeconds: number) {
  return rpc<{
    party_id: string;
    join_code: string;
    player_id: string;
    session_secret: string;
    answer_seconds: number;
    max_players: number;
    max_questions_per_player: number;
    tier: string;
  }>("soiree_create_party", { p_answer_seconds: answerSeconds });
}

export async function joinSoireeParty(joinCode: string, pseudo: string) {
  return rpc<{
    party_id: string;
    join_code: string;
    player_id: string;
    session_secret: string;
    pseudo: string;
    is_host: boolean;
  }>("soiree_join_party", { p_join_code: joinCode, p_pseudo: pseudo });
}

export async function reconnectSoireePlayer(session: RpcSession) {
  return rpc<{ party_status: string }>("soiree_reconnect_player", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function startSoireeWriting(session: RpcSession) {
  await rpc("soiree_start_writing", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function submitSoireeQuestion(
  session: RpcSession,
  questionType: SoireeQuestionType,
  text: string,
  labelPour?: string,
  labelContre?: string
) {
  return rpc<string>("soiree_submit_question", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
    p_question_type: questionType,
    p_text: text,
    p_label_pour: labelPour ?? null,
    p_label_contre: labelContre ?? null,
  });
}

export async function markSoireeWritingDone(session: RpcSession) {
  await rpc("soiree_mark_writing_done", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function startSoireeGame(session: RpcSession) {
  await rpc("soiree_start_game", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function castSoireeVote(
  session: RpcSession,
  questionId: string,
  opts: { targetPlayerId?: string; choice?: VoteChoice }
) {
  await rpc("soiree_cast_vote", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
    p_question_id: questionId,
    p_target_player_id: opts.targetPlayerId ?? null,
    p_choice: opts.choice ?? null,
  });
}

export async function closeSoireeRound(session: RpcSession) {
  return rpc<SoireeRoundResults>("soiree_close_round", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function getSoireeRoundResults(session: RpcSession) {
  return rpc<SoireeRoundResults | null>("soiree_get_round_results", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}

export async function nextSoireeRound(session: RpcSession) {
  return rpc<{ question_id: string | null; finished: boolean }>("soiree_next_round", {
    p_party_id: session.partyId,
    p_player_id: session.playerId,
    p_session_secret: session.sessionSecret,
  });
}
