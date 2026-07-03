import type { Question } from "@/types";

/** Question visible côté public : fenêtre de vote ouverte (active_at ≤ now < expires_at). */
export function isQuestionLiveForUsers(question: Question, now = Date.now()): boolean {
  const active = new Date(question.active_at).getTime();
  const expires = new Date(question.expires_at).getTime();
  return now >= active && now < expires;
}

export const KITSH_CURTAIN_LABEL = "KITSH";
