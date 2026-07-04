"use client";

interface LiveVoteCounterProps {
  total: number;
}

/** Compteur « votes en direct » — chiffres simulés, purement décoratif. */
export function LiveVoteCounter({ total }: LiveVoteCounterProps) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-white/45" aria-live="polite">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/35 opacity-80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white/75" />
      </span>
      <span>
        <span className="tabular-nums font-medium text-white/80 transition-[opacity] duration-300">
          {Math.round(total).toLocaleString("fr-FR")}
        </span>{" "}
        votes en direct
      </span>
    </div>
  );
}
