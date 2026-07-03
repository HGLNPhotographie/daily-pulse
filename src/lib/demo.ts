"use client";

import { pickQuestionText, VOTE_WINDOW_SECONDS } from "@/lib/demo-shared";
import { DEFAULT_QUESTION_OPTIONS } from "@/lib/question-options";
import type { Question, Suggestion, SuggestionStatus, UserProfile, VoteChoice, QuestionOption } from "@/types";

/**
 * Simulateur "mode démo" : données partagées via `/api/demo/*` (Mac + iPhone sur
 * le même serveur dev), votes et streak restant locaux par appareil.
 */

const VOTE_KEY = "daily-pulse:demo-vote";
const EVENT = "daily-pulse:demo-update";

async function demoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Erreur réseau (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getOrCreateDemoQuestion(): Question {
  if (typeof window === "undefined") {
    const now = new Date();
    return {
      id: "demo",
      text: pickQuestionText(),
      category: "société",
      active_at: now.toISOString(),
      expires_at: new Date(now.getTime() + VOTE_WINDOW_SECONDS * 1000).toISOString(),
      total_pour: 0,
      total_contre: 0,
      total_neutre: 0,
      options: [...DEFAULT_QUESTION_OPTIONS],
      created_at: now.toISOString(),
    };
  }
  // Placeholder SSR ; la vraie question arrive via `fetchDemoQuestion`.
  return {
    id: "demo-loading",
    text: "Chargement…",
    category: "société",
    active_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + VOTE_WINDOW_SECONDS * 1000).toISOString(),
    total_pour: 0,
    total_contre: 0,
    total_neutre: 0,
    options: [...DEFAULT_QUESTION_OPTIONS],
    created_at: new Date().toISOString(),
  };
}

export async function fetchDemoQuestion(): Promise<Question | null> {
  try {
    return await demoFetch<Question>("/api/demo/question");
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("404") || e.message.includes("Aucune question"))
    ) {
      return null;
    }
    throw e;
  }
}

export function getDemoVote(): { choice: VoteChoice; isInTime: boolean } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VOTE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { choice: parsed.choice as VoteChoice, isInTime: Boolean(parsed.isInTime) };
  } catch {
    return null;
  }
}

export function clearDemoVoteForQuestion(questionId: string) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(VOTE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { questionId?: string };
    if (!parsed.questionId || parsed.questionId !== questionId) {
      window.localStorage.removeItem(VOTE_KEY);
    }
  } catch {
    window.localStorage.removeItem(VOTE_KEY);
  }
}

export async function castDemoVote(choice: VoteChoice): Promise<{ isInTime: boolean; question: Question }> {
  const { question, isInTime } = await demoFetch<{ question: Question; isInTime: boolean }>("/api/demo/vote", {
    method: "POST",
    body: JSON.stringify({ choice }),
  });
  window.localStorage.setItem(
    VOTE_KEY,
    JSON.stringify({ choice, isInTime, votedAt: Date.now(), questionId: question.id })
  );
  window.dispatchEvent(new CustomEvent(EVENT, { detail: question }));
  return { isInTime, question };
}

/**
 * Polling serveur + événements locaux (même onglet) pour le "direct" démo.
 */
export function subscribeDemoLiveActivity(onUpdate: (q: Question | null) => void): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const question = await fetchDemoQuestion();
      onUpdate(question);
    } catch {
      onUpdate(null);
    }
  };

  void poll();
  const interval = setInterval(() => void poll(), 1500);

  const handler = (e: Event) => {
    const detail = (e as CustomEvent<Question | null>).detail;
    onUpdate(detail ?? null);
  };
  window.addEventListener(EVENT, handler);

  return () => {
    active = false;
    clearInterval(interval);
    window.removeEventListener(EVENT, handler);
  };
}

// ============================================================================
// MODE ADMIN (démo)
// ============================================================================

export async function publishDemoQuestion(
  text: string,
  category: string,
  windowSeconds = VOTE_WINDOW_SECONDS,
  options?: QuestionOption[]
): Promise<Question> {
  const question = await demoFetch<Question>("/api/demo/question", {
    method: "POST",
    body: JSON.stringify({ text, category, windowSeconds, options }),
  });
  window.localStorage.removeItem(VOTE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: question }));
  return question;
}

export async function deleteDemoQuestion(questionId: string): Promise<void> {
  await demoFetch<{ ok: boolean }>("/api/demo/question", {
    method: "DELETE",
    body: JSON.stringify({ id: questionId }),
  });
  window.localStorage.removeItem(VOTE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export async function resetDemoQuestionHistory(): Promise<void> {
  await demoFetch<{ ok: boolean }>("/api/demo/history", { method: "DELETE" });
  window.localStorage.removeItem(VOTE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export async function fetchDemoQuestionHistory(): Promise<Question[]> {
  return demoFetch<Question[]>("/api/demo/history");
}

export function getDemoQuestionHistory(): Question[] {
  return [getOrCreateDemoQuestion()];
}

export async function fetchDemoSuggestions(): Promise<Suggestion[]> {
  return demoFetch<Suggestion[]>("/api/demo/suggestions");
}

export function getDemoSuggestions(): Suggestion[] {
  return [];
}

export async function addDemoSuggestion(questionText: string): Promise<Suggestion> {
  return demoFetch<Suggestion>("/api/demo/suggestions", {
    method: "POST",
    body: JSON.stringify({ questionText }),
  });
}

export async function updateDemoSuggestionStatus(id: string, status: SuggestionStatus): Promise<Suggestion[]> {
  return demoFetch<Suggestion[]>(`/api/demo/suggestions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

const DEMO_PSEUDOS = ["Néon_92", "CaptainVote", "Zoe.exe", "MaxPower", "LunaBlaze", "TonyStreak", "Aria_TV", "Ryder99"];

export function getDemoUsers(): UserProfile[] {
  const now = Date.now();
  return DEMO_PSEUDOS.map((pseudo, i) => {
    const seed = (i * 2654435761) % 97;
    const streak = seed % 42;
    return {
      id: `demo-user-${i}`,
      email: `${pseudo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}@exemple.com`,
      pseudo,
      age_range: null,
      gender: null,
      profile_completed_at: null,
      current_streak: streak,
      highest_streak: Math.max(streak, (seed * 3) % 60),
      last_vote_date: new Date(now - (seed % 3) * 86_400_000).toISOString(),
      is_admin: i === 0,
      is_banned: false,
      banned_at: null,
      created_at: new Date(now - (i + 1) * 7 * 86_400_000).toISOString(),
    };
  });
}
