export type SoireeSubscriptionTier = "free" | "pro";

export type SoireePartyStatus = "lobby" | "writing" | "playing" | "results" | "finished" | "expired";

export type SoireeQuestionType = "member_pick" | "finger_point" | "pour_contre";

export type SoireeQuestionStatus = "pending" | "drawn" | "done";

export interface SoireeParty {
  id: string;
  host_user_id: string;
  join_code: string;
  status: SoireePartyStatus;
  answer_seconds: number;
  max_players: number;
  max_questions_per_player: number;
  tier: SoireeSubscriptionTier;
  current_question_id: string | null;
  round_ends_at: string | null;
  created_at: string;
  lobby_expires_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface SoireePlayer {
  id: string;
  party_id: string;
  pseudo: string;
  is_host: boolean;
  writing_done: boolean;
  joined_at: string;
}

export interface SoireeQuestion {
  id: string;
  party_id: string;
  question_type: SoireeQuestionType;
  text: string;
  label_pour: string | null;
  label_contre: string | null;
  status: SoireeQuestionStatus;
  created_at: string;
  drawn_at: string | null;
}

export interface SoireePlayerSession {
  partyId: string;
  playerId: string;
  sessionSecret: string;
  pseudo: string;
  isHost: boolean;
}

export interface SoireePodiumEntry {
  pseudo: string;
  player_id: string;
  vote_count: number;
}

export interface SoireeFingerVote {
  from_pseudo: string;
  to_pseudo: string;
}

export interface SoireeRoundResults {
  question_id: string;
  question_type: SoireeQuestionType;
  text: string;
  anonymous: boolean;
  label_pour?: string | null;
  label_contre?: string | null;
  pour?: number;
  contre?: number;
  podium?: SoireePodiumEntry[];
  finger_votes?: SoireeFingerVote[];
}

export const SOIREE_QUESTION_TYPE_LABELS: Record<SoireeQuestionType, string> = {
  member_pick: "Choisir un membre",
  finger_point: "Pointez du doigt",
  pour_contre: "Pour / Contre",
};
