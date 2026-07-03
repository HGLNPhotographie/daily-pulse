"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { publishDemoQuestion } from "@/lib/demo";
import { VOTE_WINDOW_SECONDS } from "@/lib/constants";
import type { Question } from "@/types";

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
    // Mode démo : aucune infrastructure de push réelle, on simule un succès.
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

/**
 * Publie immédiatement une nouvelle "Question du Jour" (action admin) :
 * `active_at = now()`, `expires_at = now() + windowSeconds`. Fonctionne en
 * mode démo (localStorage) ou via un insert Supabase couvert par la policy
 * RLS `questions_admin_insert`.
 */
export async function publishQuestion(
  text: string,
  category: string,
  windowSeconds: number = VOTE_WINDOW_SECONDS
): Promise<{ question: Question | null; error?: string }> {
  if (!isSupabaseConfigured) {
    const question = await publishDemoQuestion(text, category, windowSeconds);
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
    })
    .select()
    .single();

  if (error) return { question: null, error: error.message };
  return { question: data as Question };
}

/** Planifie une question à un horaire futur (sans déclencher les notifications). */
export async function scheduleQuestion(
  text: string,
  category: string,
  activeAt: Date,
  windowSeconds: number = VOTE_WINDOW_SECONDS
): Promise<{ question: Question | null; error?: string }> {
  if (!isSupabaseConfigured) {
    // Le mode démo est mono-question : la planification future n'a pas de sens
    // sans backend ; on publie donc immédiatement pour rester démontrable.
    const question = await publishDemoQuestion(text, category, windowSeconds);
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
    })
    .select()
    .single();

  if (error) return { question: null, error: error.message };
  return { question: data as Question };
}
