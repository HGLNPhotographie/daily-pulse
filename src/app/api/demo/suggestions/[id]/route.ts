import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import { updateDemoStoreSuggestionStatus } from "@/lib/demo-store.server";
import type { SuggestionStatus } from "@/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const { id } = await params;
  const body = (await request.json()) as { status?: SuggestionStatus };
  if (!body.status || !["pending", "approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const suggestions = updateDemoStoreSuggestionStatus(id, body.status);
  return NextResponse.json(suggestions);
}
