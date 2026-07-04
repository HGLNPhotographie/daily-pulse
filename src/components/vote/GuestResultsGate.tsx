"use client";

import { UserAuthCard } from "@/components/auth/UserAuthCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GuestResultsGateProps {
  open: boolean;
  votedInTime: boolean;
}

/** Bloque les résultats en direct pour les invités : pop-up inscription / connexion. */
export function GuestResultsGate({ open, votedInTime }: GuestResultsGateProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border-black/10 bg-white sm:max-w-md"
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-semibold">Résultats en direct</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-black/60">
            {votedInTime
              ? "Ton vote est validé dans les temps — bravo !"
              : "Ton vote est bien enregistré."}{" "}
            Crée un compte ou connecte-toi pour découvrir la tendance globale en temps réel.
          </DialogDescription>
        </DialogHeader>
        <UserAuthCard />
      </DialogContent>
    </Dialog>
  );
}
