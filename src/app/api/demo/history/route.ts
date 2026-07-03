import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import { getDemoStoreHistory, resetDemoStoreQuestions } from "@/lib/demo-store.server";

export async function GET() {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  return NextResponse.json(getDemoStoreHistory());
}

export async function DELETE() {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  resetDemoStoreQuestions();
  return NextResponse.json({ ok: true });
}
