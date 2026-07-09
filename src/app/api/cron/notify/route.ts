import { NextRequest, NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { sendPushToOptedInUsers } from "@/lib/push-server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  if (request.headers.get("x-cron-secret") === secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Route déclenchée par Vercel Cron (GET + Bearer) ou un scheduler externe
 * (POST + x-cron-secret). Envoie une Web Push aux abonnés opt-in.
 */
async function runCronNotify() {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo", sent: 0 });
  }

  try {
    const result = await sendPushToOptedInUsers({
      title: "📺 C'est l'heure du Rendez-vous !",
      body: "La question du jour vient de tomber. Tu as 5 minutes pour voter.",
      url: "/",
    });
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi push.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
