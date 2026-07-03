import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured, requireAdminFromRequest } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/** Bannir / débannir un utilisateur (admin). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const check = await requireAdminFromRequest(request);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { id: targetId } = await context.params;
  if (targetId === check.userId) {
    return NextResponse.json({ error: "Tu ne peux pas modifier ton propre compte ici." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { banned?: boolean };
  if (typeof body.banned !== "boolean") {
    return NextResponse.json({ error: "Champ « banned » requis (boolean)." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: target, error: fetchError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", targetId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (target.is_admin && body.banned) {
    return NextResponse.json({ error: "Impossible de bannir un administrateur." }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      is_banned: body.banned,
      banned_at: body.banned ? new Date().toISOString() : null,
    })
    .eq("id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, banned: body.banned });
}

/** Supprime définitivement un compte (auth + profil en cascade). */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const check = await requireAdminFromRequest(request);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { id: targetId } = await context.params;
  if (targetId === check.userId) {
    return NextResponse.json({ error: "Tu ne peux pas supprimer ton propre compte." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: target, error: fetchError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", targetId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (target.is_admin) {
    return NextResponse.json({ error: "Impossible de supprimer un administrateur." }, { status: 400 });
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
