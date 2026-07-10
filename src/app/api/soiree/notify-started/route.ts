import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { sendPushToUserIds } from "@/lib/push-server";

/** Notifie les joueurs opt-in qu'une soirée a démarré (appelé par l'hôte). */
export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo", sent: 0 });
  }

  const body = await request.json().catch(() => ({}));
  const partyId = typeof body.partyId === "string" ? body.partyId : "";
  if (!partyId) {
    return NextResponse.json({ error: "partyId requis." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: players } = await supabase
    .from("soiree_players")
    .select("user_id")
    .eq("party_id", partyId);

  const userIds = [...new Set((players ?? []).map((p) => p.user_id))];

  try {
    const result = await sendPushToUserIds(userIds, {
      title: "Soirée Kitsh",
      body: "La partie a commencé — rejoins le salon !",
      url: `/soiree/party/${partyId}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec push.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
