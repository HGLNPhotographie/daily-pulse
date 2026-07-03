import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseServerClient, isSupabaseServerConfigured, requireAdminFromRequest } from "@/lib/supabase/server";

/**
 * Déclenchée manuellement depuis le panneau admin (`/admin`) pour envoyer,
 * à la demande, la Web Push "C'est l'heure du Rendez-vous !" à tous les
 * abonnés — sans attendre le scheduler automatique (`/api/cron/notify`).
 * Protégée par vérification de session + `is_admin`, jamais par un secret
 * partagé côté client.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo", sent: 0 });
  }

  const check = await requireAdminFromRequest(request);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Clés VAPID manquantes côté serveur." }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:contact@dailypulse.app", vapidPublicKey, vapidPrivateKey);

  const body = await request.json().catch(() => ({}));
  const title: string = body.title || "📺 C'est l'heure du Rendez-vous !";
  const message: string = body.body || "La question du jour vient de tomber. Tu as 5 minutes pour voter.";

  const supabase = getSupabaseServerClient();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = JSON.stringify({ title, body: message });
  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent += 1;
      } catch {
        failed += 1;
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed, totalSubscribers: subs?.length ?? 0 });
}
