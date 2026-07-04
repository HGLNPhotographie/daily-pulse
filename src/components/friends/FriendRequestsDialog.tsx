"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StreakFlame } from "@/components/flame/StreakFlame";
import type { FriendRequestItem } from "@/types";

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: FriendRequestItem[];
  onRespond: (requestId: string, accept: boolean) => Promise<{ error: string | null }>;
}

export function FriendRequestsDialog({ open, onOpenChange, requests, onRespond }: FriendRequestsDialogProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (id: string, accept: boolean) => {
    setBusyId(id);
    const result = await onRespond(id, accept);
    setBusyId(null);
    if (result.error) toast.error(result.error);
    else toast.success(accept ? "Ami ajouté !" : "Demande refusée.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-black/10 bg-white">
        <DialogHeader>
          <DialogTitle>Demandes d&apos;amis</DialogTitle>
          <DialogDescription>
            {requests.length === 0 ? "Aucune demande en attente." : `${requests.length} demande(s) en attente.`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/8 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{req.from_pseudo}</p>
                <div className="flex items-center gap-1.5 text-xs text-black/45">
                  <StreakFlame streak={req.from_streak} size="sm" />
                  {req.from_streak} j
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  disabled={busyId === req.id}
                  onClick={() => void handle(req.id, false)}
                  aria-label="Refuser"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={busyId === req.id}
                  onClick={() => void handle(req.id, true)}
                  aria-label="Accepter"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
