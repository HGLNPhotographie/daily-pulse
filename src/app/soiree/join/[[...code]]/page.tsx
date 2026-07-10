"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensureVoterSession, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseSoireeJoinCode, saveSoireeSession } from "@/lib/soiree/api";
import { joinSoireeParty } from "@/lib/soiree/rpc";

function JoinContent() {
  const params = useParams();
  const router = useRouter();
  const codeParam = typeof params.code === "string" ? params.code.toUpperCase() : "";
  const [code, setCode] = useState(codeParam);
  const [pseudo, setPseudo] = useState("");
  const [mode, setMode] = useState<"form" | "scan">(codeParam ? "form" : "form");
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    void ensureVoterSession(getSupabaseBrowserClient()!);
  }, []);

  useEffect(() => {
    if (mode !== "scan") return;
    const scanner = new Html5Qrcode("soiree-qr-reader");
    scannerRef.current = scanner;
    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const parsed = parseSoireeJoinCode(decoded);
          if (parsed) {
            setCode(parsed);
            setMode("form");
            void scanner.stop().catch(() => null);
          }
        },
        () => {}
      )
      .catch(() => toast.error("Impossible d'accéder à la caméra."));
    return () => {
      void scanner.stop().catch(() => null);
    };
  }, [mode]);

  const handleJoin = async () => {
    if (!code.trim() || !pseudo.trim()) {
      toast.error("Code et pseudo requis.");
      return;
    }
    setLoading(true);
    try {
      const result = await joinSoireeParty(code, pseudo.trim());
      saveSoireeSession(result.party_id, {
        playerId: result.player_id,
        sessionSecret: result.session_secret,
        pseudo: result.pseudo,
        isHost: result.is_host,
      });
      router.push(`/soiree/party/${result.party_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de rejoindre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-white px-4 pt-10">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-lg font-semibold">Rejoindre une partie</h1>

        {mode === "scan" ? (
          <div className="space-y-3">
            <div id="soiree-qr-reader" className="overflow-hidden rounded-2xl" />
            <Button type="button" variant="outline" className="w-full" onClick={() => setMode("form")}>
              Saisir le code manuellement
            </Button>
          </div>
        ) : (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code à 6 caractères"
              maxLength={6}
              className="w-full rounded-xl border border-black/10 p-3 text-center font-display text-xl tracking-[0.3em] outline-none"
            />
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo"
              maxLength={24}
              className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none"
            />
            <Button type="button" className="w-full" disabled={loading} onClick={() => void handleJoin()}>
              {loading ? "Connexion…" : "Entrer dans la partie"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setMode("scan")}>
              Scanner un QR code
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SoireeJoinPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center">Chargement…</div>}>
      <JoinContent />
    </Suspense>
  );
}
