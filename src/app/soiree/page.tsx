"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PartyPopper, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSession } from "@/hooks/useUserSession";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SoireeHubPage() {
  const router = useRouter();
  const { status, isAnonymous } = useUserSession();
  const canHost = status === "signed-in" && !isAnonymous;

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <PartyPopper className="h-10 w-10 text-black/30" />
        <p className="text-sm text-black/55">Le mode Soirée nécessite Supabase (non disponible en démo).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-4 pt-10 pb-8">
      <div className="space-y-2 text-center">
        <PartyPopper className="mx-auto h-8 w-8 text-black/70" />
        <h1 className="text-sm font-semibold uppercase tracking-[0.25em] text-black/45">Soirée</h1>
        <p className="max-w-sm text-sm text-black/55">
          Crée une partie entre amis, scanne le QR code et jouez avec vos propres questions.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {canHost ? (
          <Link
            href="/soiree/create"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Créer une partie
          </Link>
        ) : (
          <div className="rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3 text-center text-sm text-black/55">
            {status === "loading"
              ? "Chargement…"
              : "Connecte-toi avec un compte pour héberger une partie."}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => router.push("/soiree/join")}
        >
          <ScanLine className="h-4 w-4" />
          Rejoindre une partie
        </Button>
      </div>
    </div>
  );
}
