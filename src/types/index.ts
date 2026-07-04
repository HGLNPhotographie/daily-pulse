export type VoteChoice = "pour" | "contre" | "neutre";

export interface QuestionOption {
  key: VoteChoice;
  /** Libellé affiché (mot, emoji, flèche…). */
  label: string;
}

export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface Question {
  id: string;
  text: string;
  category: string | null;
  active_at: string;
  expires_at: string;
  total_pour: number;
  total_contre: number;
  total_neutre: number;
  options?: QuestionOption[];
  created_at: string;
}

export interface Vote {
  id: string;
  user_id: string;
  question_id: string;
  choice: VoteChoice;
  voted_at: string;
  is_in_time: boolean;
}

export type AgeRange = "16-17" | "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export type Gender = "female" | "male" | "other" | "prefer_not";

export interface UserProfile {
  id: string;
  email: string | null;
  pseudo: string | null;
  birth_date?: string | null;
  age_range: AgeRange | null;
  gender: Gender | null;
  profile_completed_at: string | null;
  current_streak: number;
  highest_streak: number;
  last_vote_date: string | null;
  is_admin: boolean;
  is_banned?: boolean;
  banned_at?: string | null;
  votes_private?: boolean;
  created_at: string;
}

/** Profil utilisateur exposé dans l'admin (sans date de naissance). */
export type AdminUserListItem = Omit<UserProfile, "birth_date">;

export interface Suggestion {
  id: string;
  user_id: string;
  question_text: string;
  status: SuggestionStatus;
  created_at: string;
}

export interface QuestionResults {
  total: number;
  pour: number;
  contre: number;
  neutre: number;
  pctPour: number;
  pctContre: number;
  pctNeutre: number;
}

export function computeResults(q: Pick<Question, "total_pour" | "total_contre" | "total_neutre">): QuestionResults {
  const total = q.total_pour + q.total_contre + q.total_neutre;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  return {
    total,
    pour: q.total_pour,
    contre: q.total_contre,
    neutre: q.total_neutre,
    pctPour: pct(q.total_pour),
    pctContre: pct(q.total_contre),
    pctNeutre: pct(q.total_neutre),
  };
}

/** État de la session de vote du jour, calculé côté client pour piloter l'UI. */
export type PollPhase =
  | "loading"
  | "no-question" // aucune question en cours — rideau fermé
  | "before-window" // la question du jour n'a pas encore été révélée
  | "curtain" // fenêtre active, rideau pas encore ouvert
  | "voting" // rideau ouvert, compte à rebours en cours, pas encore voté
  | "voted-in-time" // vote posé dans les temps -> résultats + flamme incrémentée
  | "expired-voted-late" // a voté hors délai -> résultats visibles, pas de flamme
  | "expired-no-vote"; // fenêtre expirée, aucun vote -> flamme cassée

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequestItem {
  id: string;
  from_user_id: string;
  from_pseudo: string;
  from_streak: number;
  created_at: string;
}

export interface FriendListItem {
  friend_id: string;
  pseudo: string;
  current_streak: number;
  highest_streak: number;
}

export interface FriendLastVote {
  hidden: boolean;
  voted: boolean;
  choice: VoteChoice | null;
  question_id: string | null;
  question_text: string | null;
  options?: QuestionOption[] | null;
}
