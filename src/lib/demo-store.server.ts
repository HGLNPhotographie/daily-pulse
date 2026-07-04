import "server-only";

import { isQuestionLiveForUsers } from "@/lib/question-active";
import { DEFAULT_QUESTION_OPTIONS } from "@/lib/question-options";
import { createDemoId, pickQuestionText, seedRandomCounts, VOTE_WINDOW_SECONDS } from "@/lib/demo-shared";
import type { Question, Suggestion, SuggestionStatus, VoteChoice } from "@/types";

/**
 * État démo partagé côté serveur : permet à l'admin (Mac) et à l'app (iPhone
 * sur le même `npm run dev`) de voir les mêmes questions / suggestions.
 */
let currentQuestion: Question | null = null;
let questionHistory: Question[] = [];
let suggestions: Suggestion[] = [];

function pushHistory(question: Question) {
  questionHistory = [question, ...questionHistory.filter((q) => q.id !== question.id)].slice(0, 30);
}

function createDefaultQuestion(): Question {
  const now = new Date();
  return {
    id: `demo-${now.getTime()}`,
    text: pickQuestionText(),
    category: "société",
    active_at: now.toISOString(),
    expires_at: new Date(now.getTime() + VOTE_WINDOW_SECONDS * 1000).toISOString(),
    options: [...DEFAULT_QUESTION_OPTIONS],
    ...seedRandomCounts(),
    created_at: now.toISOString(),
  };
}

export function getActiveDemoStoreQuestion(): Question | null {
  const current = getCurrentDemoStoreQuestion();
  if (!current || !isQuestionLiveForUsers(current)) return null;
  return current;
}

/** Dernière question publiée et déjà active (même après la fenêtre à temps). */
export function getCurrentDemoStoreQuestion(): Question | null {
  if (!currentQuestion) return null;
  if (Date.now() < new Date(currentQuestion.active_at).getTime()) return null;
  return currentQuestion;
}

export function getOrCreateDemoStoreQuestion(): Question {
  const current = getCurrentDemoStoreQuestion();
  if (current) return current;
  currentQuestion = createDefaultQuestion();
  pushHistory(currentQuestion);
  return currentQuestion;
}

export function publishDemoStoreQuestion(
  text: string,
  category: string,
  windowSeconds = VOTE_WINDOW_SECONDS,
  options = DEFAULT_QUESTION_OPTIONS
): Question {
  const now = new Date();
  const question: Question = {
    id: `demo-${now.getTime()}`,
    text,
    category,
    active_at: now.toISOString(),
    expires_at: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
    total_pour: 0,
    total_contre: 0,
    total_neutre: 0,
    options: options.map((o) => ({ ...o })),
    created_at: now.toISOString(),
  };
  currentQuestion = question;
  pushHistory(question);
  return question;
}

export function castDemoStoreVote(choice: VoteChoice): { question: Question; isInTime: boolean } {
  const question = getOrCreateDemoStoreQuestion();
  const isInTime = Date.now() < new Date(question.expires_at).getTime();
  const key = `total_${choice}` as const;
  const updated: Question = { ...question, [key]: question[key] + 1 };
  currentQuestion = updated;
  return { question: updated, isInTime };
}

export function bumpDemoStoreActivity(): Question | null {
  if (!currentQuestion) return null;
  if (Date.now() > new Date(currentQuestion.expires_at).getTime() + 5 * 60 * 1000) return null;

  const choices: Array<"total_pour" | "total_contre" | "total_neutre"> = ["total_pour", "total_contre", "total_neutre"];
  const key = choices[Math.floor(Math.random() * choices.length)];
  currentQuestion = { ...currentQuestion, [key]: currentQuestion[key] + Math.ceil(Math.random() * 3) };
  return currentQuestion;
}

export function deleteDemoStoreQuestion(id: string): boolean {
  const wasCurrent = currentQuestion?.id === id;
  questionHistory = questionHistory.filter((q) => q.id !== id);
  if (wasCurrent) {
    currentQuestion = null;
  }
  return true;
}

export function resetDemoStoreQuestions(): void {
  questionHistory = [];
  currentQuestion = null;
}

export function getDemoStoreHistory(): Question[] {
  const current = getOrCreateDemoStoreQuestion();
  if (!questionHistory.some((q) => q.id === current.id)) pushHistory(current);
  return [current, ...questionHistory.filter((q) => q.id !== current.id)];
}

export function getDemoStoreSuggestions(): Suggestion[] {
  return suggestions;
}

export function addDemoStoreSuggestion(questionText: string): Suggestion {
  const suggestion: Suggestion = {
    id: createDemoId(),
    user_id: "demo",
    question_text: questionText,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  suggestions = [suggestion, ...suggestions];
  return suggestion;
}

export function updateDemoStoreSuggestionStatus(id: string, status: SuggestionStatus): Suggestion[] {
  suggestions = suggestions.map((s) => (s.id === id ? { ...s, status } : s));
  return suggestions;
}
