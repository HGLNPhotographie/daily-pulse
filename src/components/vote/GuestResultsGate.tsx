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
        className="max-w-md border-primary/25 bg-card/95 sm:max-w-md"
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-display text-2xl tracking-wide text-glow-cyan">
            RÉSULTATS EN DIRECT
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
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
