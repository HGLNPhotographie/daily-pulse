import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import {
  bumpDemoStoreActivity,
  getOrCreateDemoStoreQuestion,
  publishDemoStoreQuestion,
} from "@/lib/demo-store.server";

export async function GET() {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  bumpDemoStoreActivity();
  return NextResponse.json(getOrCreateDemoStoreQuestion());
}

export async function POST(request: Request) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const body = (await request.json()) as { text?: string; category?: string; windowSeconds?: number };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Texte de question requis." }, { status: 400 });
  }
  const question = publishDemoStoreQuestion(
    body.text.trim(),
    body.category?.trim() || "société",
    body.windowSeconds
  );
  return NextResponse.json(question);
}
