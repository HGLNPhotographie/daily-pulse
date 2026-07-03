import type { Question } from "@/types";

export type QuestionAdminState = "scheduled" | "live" | "ended";

/** Question visible côté public : fenêtre de vote ouverte (active_at ≤ now < expires_at). */
export function isQuestionLiveForUsers(question: Question, now = Date.now()): boolean {
  return getQuestionAdminState(question, now) === "live";
}

export function getQuestionAdminState(question: Question, now = Date.now()): QuestionAdminState {
  const active = new Date(question.active_at).getTime();
  const expires = new Date(question.expires_at).getTime();
  if (now < active) return "scheduled";
  if (now < expires) return "live";
  return "ended";
}

export function findLiveQuestion(questions: Question[], now = Date.now()): Question | null {
  return questions.find((q) => getQuestionAdminState(q, now) === "live") ?? null;
}

export function findLastEndedQuestion(questions: Question[], now = Date.now()): Question | null {
  return (
    questions
      .filter((q) => getQuestionAdminState(q, now) === "ended")
      .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0] ?? null
  );
}

export const KITSH_CURTAIN_LABEL = "KITSH";
