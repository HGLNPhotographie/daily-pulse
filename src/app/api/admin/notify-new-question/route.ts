import { NextRequest, NextResponse } from "next/server";
import { isSupabaseServerConfigured, requireAdminFromRequest } from "@/lib/supabase/server";
import { sendPushToOptedInUsers } from "@/lib/push-server";

/** Envoie une notification push à tous les abonnés opt-in (nouvelle question). */
export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo", sent: 0 });
  }

  const check = await requireAdminFromRequest(request);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json().catch(() => ({}));
  const questionText = typeof body.text === "string" ? body.text.trim() : "";

  try {
    const result = await sendPushToOptedInUsers({
      title: "📺 Nouvelle question !",
      body: questionText || "Une nouvelle question vient d'être publiée. Tu as 5 minutes pour voter.",
      url: "/",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi push.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
