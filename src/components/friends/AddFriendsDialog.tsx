"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseFriendIdFromInvite } from "@/lib/friends-api";

interface AddFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendByUserId: (userId: string) => Promise<{ error: string | null }>;
  onSendByPseudo: (pseudo: string) => Promise<{ error: string | null }>;
  currentUserId?: string;
}

type Mode = "choose" | "scan" | "pseudo";

export function AddFriendsDialog({
  open,
  onOpenChange,
  onSendByUserId,
  onSendByPseudo,
  currentUserId,
}: AddFriendsDialogProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [pseudo, setPseudo] = useState("");
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStartedRef = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current && scannerStartedRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerStartedRef.current = false;
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    if (!open || mode !== "scan") return;

    let cancelled = false;
    const scanner = new Html5Qrcode("friend-qr-reader");
    scannerRef.current = scanner;

    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          const friendId = parseFriendIdFromInvite(decoded);
          if (!friendId) return;
          if (friendId === currentUserId) {
            toast.error("Tu ne peux pas t'ajouter toi-même.");
            return;
          }
          setBusy(true);
          const result = await onSendByUserId(friendId);
          setBusy(false);
          if (result.error) toast.error(result.error);
          else {
            toast.success("Demande d'ami envoyée !");
            onOpenChange(false);
          }
        },
        () => {}
      )
      .then(() => {
        if (!cancelled) scannerStartedRef.current = true;
      })
      .catch(() => {
        toast.error("Impossible d'accéder à la caméra. Utilise le pseudo.");
        setMode("pseudo");
      });

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, mode, currentUserId, onSendByUserId, onOpenChange]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setMode("choose");
      setPseudo("");
      setBusy(false);
    }
  }, [open]);

  const handlePseudoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) return;
    setBusy(true);
    const result = await onSendByPseudo(pseudo);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Demande d'ami envoyée !");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-black/10 bg-white">
        <DialogHeader>
          <DialogTitle>Ajouter des amis</DialogTitle>
          <DialogDescription>Scanne un QR code Kitsh ou cherche un pseudo.</DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="grid gap-3">
            <Button type="button" variant="outline" className="h-12 justify-start gap-3" onClick={() => setMode("scan")}>
              <QrCode className="h-5 w-5" />
              Scanner un QR code
            </Button>
            <Button type="button" variant="outline" className="h-12 justify-start gap-3" onClick={() => setMode("pseudo")}>
              <UserPlus className="h-5 w-5" />
              Ajouter par pseudo
            </Button>
          </div>
        )}

        {mode === "scan" && (
          <div className="space-y-3">
            <div id="friend-qr-reader" className="overflow-hidden rounded-xl border border-black/10" />
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("choose")} disabled={busy}>
              Retour
            </Button>
          </div>
        )}

        {mode === "pseudo" && (
          <form onSubmit={handlePseudoSubmit} className="space-y-3">
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Pseudo exact"
              maxLength={24}
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setMode("choose")}>
                Retour
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
