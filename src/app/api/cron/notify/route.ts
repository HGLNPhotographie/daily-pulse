import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  if (request.headers.get("x-cron-secret") === secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Route déclenchée par Vercel Cron (GET + Bearer) ou un scheduler externe
 * (POST + x-cron-secret). Envoie une Web Push à tous les abonnés.
 */
async function runCronNotify() {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo", sent: 0 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys manquantes" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:contact@dailypulse.app", vapidPublicKey, vapidPrivateKey);

  const supabase = getSupabaseServerClient();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = JSON.stringify({
    title: "📺 C'est l'heure du Rendez-vous !",
    body: "La question du jour vient de tomber. Tu as 5 minutes pour voter.",
  });

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent += 1;
      } catch {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runCronNotify();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runCronNotify();
}
