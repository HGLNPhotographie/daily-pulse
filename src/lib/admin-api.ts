"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteDemoQuestion,
  publishDemoQuestion,
  resetDemoQuestionHistory,
} from "@/lib/demo";
import { normalizeQuestionOptions } from "@/lib/question-options";
import { VOTE_WINDOW_SECONDS } from "@/lib/constants";
import type { Question, QuestionOption } from "@/types";

interface NotifyPayload {
  title?: string;
  body?: string;
}

interface NotifyResult {
  ok: boolean;
  sent: number;
  failed?: number;
  totalSubscribers?: number;
  mode?: "demo";
  error?: string;
}

/** Déclenche l'envoi immédiat de la Web Push à tous les abonnés (action admin). */
export async function sendNotificationNow(payload: NotifyPayload = {}): Promise<NotifyResult> {
  if (!isSupabaseConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true, sent: Math.floor(Math.random() * 250) + 40, mode: "demo" };
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

  if (!session) return { ok: false, sent: 0, error: "Session admin manquante." };

  const res = await fetch("/api/admin/notify-now", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, sent: 0, error: data.error || "Échec de l'envoi." };
  return { ok: true, ...data };
}

export async function publishQuestion(
  text: string,
  category: string,
  windowSeconds: number = VOTE_WINDOW_SECONDS,
  options?: QuestionOption[]
): Promise<{ question: Question | null; error?: string }> {
  const normalizedOptions = normalizeQuestionOptions(options);

  if (!isSupabaseConfigured) {
    const question = await publishDemoQuestion(text, category, windowSeconds, normalizedOptions);
    return { question };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { question: null, error: "Client Supabase indisponible." };

  const now = new Date();
  const { data, error } = await supabase
    .from("questions")
    .insert({
      text,
      category,
      active_at: now.toISOString(),
      expires_at: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
      options: normalizedOptions,
    })
    .select()
    .single();

  if (error) return { question: null, error: error.message };
  return { question: data as Question };
}

export async function scheduleQuestion(
  text: string,
  category: string,
  activeAt: Date,
  windowSeconds: number = VOTE_WINDOW_SECONDS,
  options?: QuestionOption[]
): Promise<{ question: Question | null; error?: string }> {
  const normalizedOptions = normalizeQuestionOptions(options);

  if (!isSupabaseConfigured) {
    const question = await publishDemoQuestion(text, category, windowSeconds, normalizedOptions);
    return { question };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { question: null, error: "Client Supabase indisponible." };

  const { data, error } = await supabase
    .from("questions")
    .insert({
      text,
      category,
      active_at: activeAt.toISOString(),
      expires_at: new Date(activeAt.getTime() + windowSeconds * 1000).toISOString(),
      options: normalizedOptions,
    })
    .select()
    .single();

  if (error) return { question: null, error: error.message };
  return { question: data as Question };
}

/** Supprime une question (votes associés en cascade). */
export async function deleteQuestion(questionId: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    await deleteDemoQuestion(questionId);
    return {};
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Client Supabase indisponible." };

  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) return { error: error.message };
  return {};
}

/** Supprime tout l'historique des questions (irréversible). */
export async function resetQuestionHistory(): Promise<{ error?: string; deleted?: number }> {
  if (!isSupabaseConfigured) {
    await resetDemoQuestionHistory();
    return { deleted: 0 };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Client Supabase indisponible." };

  const { data, error } = await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
  if (error) return { error: error.message };
  return { deleted: data?.length ?? 0 };
}

async function adminUserRequest(userId: string, init: RequestInit): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: "Indisponible en mode démo." };
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

  if (!session) return { error: "Session admin manquante." };

  const res = await fetch(`/api/admin/users/${userId}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { error: data.error || "Action impossible." };
  return {};
}

export async function setUserBanned(userId: string, banned: boolean): Promise<{ error?: string }> {
  return adminUserRequest(userId, {
    method: "PATCH",
    body: JSON.stringify({ banned }),
  });
}

export async function deleteUserAccount(userId: string): Promise<{ error?: string }> {
  return adminUserRequest(userId, { method: "DELETE" });
}
