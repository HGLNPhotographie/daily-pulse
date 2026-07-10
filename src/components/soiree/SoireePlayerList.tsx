"use client";

import type { SoireePlayer } from "@/types/soiree";
import { cn } from "@/lib/utils";

interface SoireePlayerListProps {
  players: SoireePlayer[];
  maxPlayers: number;
  showWritingStatus?: boolean;
}

export function SoireePlayerList({ players, maxPlayers, showWritingStatus }: SoireePlayerListProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/45">
        Joueurs ({players.length}/{maxPlayers})
      </p>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-black/8 px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  showWritingStatus && p.writing_done ? "bg-emerald-500" : "bg-black/20"
                )}
              />
              <span className="font-medium">{p.pseudo}</span>
            </div>
            <span className="text-xs text-black/45">
              {p.is_host ? "Hôte" : showWritingStatus ? (p.writing_done ? "Prêt" : "En cours") : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
