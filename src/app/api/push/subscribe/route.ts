import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured, requireUserFromRequest } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const auth = await requireUserFromRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("users").update({ push_notifications_enabled: true }).eq("id", auth.user.id);

  return NextResponse.json({ ok: true });
}
