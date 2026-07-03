import { NextResponse } from "next/server";
import { assertDemoApiAvailable } from "@/lib/demo-guard.server";
import { addDemoStoreSuggestion, getDemoStoreSuggestions } from "@/lib/demo-store.server";

export async function GET() {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  return NextResponse.json(getDemoStoreSuggestions());
}

export async function POST(request: Request) {
  const blocked = assertDemoApiAvailable();
  if (blocked) return blocked;
  const body = (await request.json()) as { questionText?: string };
  if (!body.questionText?.trim() || body.questionText.trim().length < 5) {
    return NextResponse.json({ error: "La suggestion doit faire au moins 5 caractères." }, { status: 400 });
  }
  const suggestion = addDemoStoreSuggestion(body.questionText.trim());
  return NextResponse.json(suggestion);
}
