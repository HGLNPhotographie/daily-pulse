import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import { castDemoStoreVote } from "@/lib/demo-store.server";
import type { VoteChoice } from "@/types";

export async function POST(request: Request) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const body = (await request.json()) as { choice?: VoteChoice };
  if (!body.choice || !["pour", "contre", "neutre"].includes(body.choice)) {
    return NextResponse.json({ error: "Choix de vote invalide." }, { status: 400 });
  }
  const { question, isInTime } = castDemoStoreVote(body.choice);
  return NextResponse.json({ question, isInTime });
}
