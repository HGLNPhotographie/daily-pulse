import "server-only";

import webpush from "web-push";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  totalSubscribers: number;
}

function getVapidKeys() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("Clés VAPID manquantes côté serveur.");
  }
  return { vapidPublicKey, vapidPrivateKey };
}

/** Envoie une Web Push aux abonnés ayant activé les notifications dans leur profil. */
export async function sendPushToOptedInUsers(payload: PushPayload): Promise<PushSendResult> {
  const { vapidPublicKey, vapidPrivateKey } = getVapidKeys();
  webpush.setVapidDetails("mailto:contact@kitsh.app", vapidPublicKey, vapidPrivateKey);

  const supabase = getSupabaseServerClient();

  const { data: enabledUsers, error: usersError } = await supabase
    .from("users")
    .select("id")
    .eq("push_notifications_enabled", true);

  if (usersError) throw new Error(usersError.message);

  const userIds = (enabledUsers ?? []).map((u) => u.id);
  if (userIds.length === 0) {
    return { sent: 0, failed: 0, totalSubscribers: 0 };
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (subsError) throw new Error(subsError.message);

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
        sent += 1;
      } catch {
        failed += 1;
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    })
  );

  return { sent, failed, totalSubscribers: subs?.length ?? 0 };
}

/** Envoie une Web Push à une liste d'utilisateurs opt-in. */
export async function sendPushToUserIds(userIds: string[], payload: PushPayload): Promise<PushSendResult> {
  if (userIds.length === 0) {
    return { sent: 0, failed: 0, totalSubscribers: 0 };
  }

  const { vapidPublicKey, vapidPrivateKey } = getVapidKeys();
  webpush.setVapidDetails("mailto:contact@kitsh.app", vapidPublicKey, vapidPrivateKey);

  const supabase = getSupabaseServerClient();

  const { data: enabledUsers, error: usersError } = await supabase
    .from("users")
    .select("id")
    .in("id", userIds)
    .eq("push_notifications_enabled", true);

  if (usersError) throw new Error(usersError.message);

  const enabledIds = (enabledUsers ?? []).map((u) => u.id);
  if (enabledIds.length === 0) {
    return { sent: 0, failed: 0, totalSubscribers: 0 };
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", enabledIds);

  if (subsError) throw new Error(subsError.message);

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
        sent += 1;
      } catch {
        failed += 1;
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    })
  );

  return { sent, failed, totalSubscribers: subs?.length ?? 0 };
}
