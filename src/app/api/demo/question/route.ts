import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import { normalizeQuestionOptions } from "@/lib/question-options";
import {
  bumpDemoStoreActivity,
  deleteDemoStoreQuestion,
  getOrCreateDemoStoreQuestion,
  publishDemoStoreQuestion,
} from "@/lib/demo-store.server";
import type { QuestionOption } from "@/types";

export async function GET() {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  bumpDemoStoreActivity();
  return NextResponse.json(getOrCreateDemoStoreQuestion());
}

export async function POST(request: Request) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const body = (await request.json()) as {
    text?: string;
    category?: string;
    windowSeconds?: number;
    options?: QuestionOption[];
  };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Texte de question requis." }, { status: 400 });
  }
  const question = publishDemoStoreQuestion(
    body.text.trim(),
    body.category?.trim() || "société",
    body.windowSeconds,
    normalizeQuestionOptions(body.options)
  );
  return NextResponse.json(question);
}

export async function DELETE(request: Request) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "ID requis." }, { status: 400 });
  }
  deleteDemoStoreQuestion(body.id);
  return NextResponse.json({ ok: true });
}
