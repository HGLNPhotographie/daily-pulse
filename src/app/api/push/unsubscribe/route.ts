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

  const supabase = getSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", auth.user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const { error: profileError } = await supabase
    .from("users")
    .update({ push_notifications_enabled: false })
    .eq("id", auth.user.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
