"use client";

import { ensureVoterSession, getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const PROMPT_DISMISSED_KEY = "kitsh:push-prompt-dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function wasPushPromptDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PROMPT_DISMISSED_KEY) === "1";
}

export function dismissPushPrompt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isSupabaseConfigured) return headers;

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return headers;

  await ensureVoterSession(supabase).catch(() => null);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/** Demande la permission puis souscrit aux Web Push Notifications (VAPID). */
export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Notifications non supportées sur cet appareil." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permission refusée." };
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const headers = await authHeaders();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(subscription),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "Échec de l'abonnement." };
  }

  dismissPushPrompt();
  return { ok: true };
}

/** Désabonne et désactive les notifications push côté profil. */
export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    /* ignore */
  }

  if (!isSupabaseConfigured) return { ok: true };

  const headers = await authHeaders();
  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "Échec de la désinscription." };
  }

  return { ok: true };
}
