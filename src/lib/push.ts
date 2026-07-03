"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/** Demande la permission puis souscrit aux Web Push Notifications (VAPID). */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY manquant : notifications push désactivées.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(subscription),
  });

  return subscription;
}
