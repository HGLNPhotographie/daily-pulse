import { NextRequest, NextResponse } from "next/server";
import { isSupabaseServerConfigured, requireAdminFromRequest } from "@/lib/supabase/server";
import { NEW_QUESTION_PUSH_BODY, NEW_QUESTION_PUSH_TITLE } from "@/lib/push-messages";
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

  try {
    const result = await sendPushToOptedInUsers({
      title: NEW_QUESTION_PUSH_TITLE,
      body: NEW_QUESTION_PUSH_BODY,
      url: "/",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi push.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

