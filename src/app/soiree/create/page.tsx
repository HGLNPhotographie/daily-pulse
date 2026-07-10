"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SOIREE_ANSWER_SECONDS_DEFAULT,
  SOIREE_ANSWER_SECONDS_MAX,
  SOIREE_ANSWER_SECONDS_MIN,
} from "@/lib/soiree/api";
import { saveSoireeSession } from "@/lib/soiree/api";
import { createSoireeParty } from "@/lib/soiree/rpc";

export default function SoireeCreatePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(SOIREE_ANSWER_SECONDS_DEFAULT);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await createSoireeParty(seconds);
      saveSoireeSession(result.party_id, {
        playerId: result.player_id,
        sessionSecret: result.session_secret,
        pseudo: "Hôte",
        isHost: true,
      });
      router.push(`/soiree/party/${result.party_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de créer la partie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-4 pt-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Nouvelle partie</h1>
          <p className="text-sm text-black/55">Tu seras l&apos;hôte. Les invités rejoignent via QR code.</p>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-black/45">
            Temps de réponse ({SOIREE_ANSWER_SECONDS_MIN}–{SOIREE_ANSWER_SECONDS_MAX} s)
          </span>
          <input
            type="range"
            min={SOIREE_ANSWER_SECONDS_MIN}
            max={SOIREE_ANSWER_SECONDS_MAX}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-center text-2xl font-semibold">{seconds}s</p>
        </label>

        <Button type="button" className="w-full" disabled={loading} onClick={() => void handleCreate()}>
          {loading ? "Création…" : "Créer le salon"}
        </Button>
      </div>
    </div>
  );
}
