"use client";

import { motion } from "framer-motion";
import type { SoireeFingerVote, SoireePodiumEntry, SoireeQuestionType } from "@/types/soiree";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

interface SoireePodiumProps {
  questionType: SoireeQuestionType;
  text: string;
  labelPour?: string | null;
  labelContre?: string | null;
  pour?: number;
  contre?: number;
  podium?: SoireePodiumEntry[];
  fingerVotes?: SoireeFingerVote[];
}

export function SoireePodium({
  questionType,
  text,
  labelPour,
  labelContre,
  pour = 0,
  contre = 0,
  podium = [],
  fingerVotes = [],
}: SoireePodiumProps) {
  const winner = podium[0];
  const pourWins = pour >= contre;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4 rounded-2xl border border-black/8 bg-white p-4 shadow-sm"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-black/45">Résultats</p>
        {winner && questionType !== "pour_contre" && (
          <p className="mt-2 text-lg font-semibold">
            {MEDALS[0]} {winner.pseudo}
          </p>
        )}
        {questionType === "pour_contre" && (
          <p className="mt-2 text-lg font-semibold">
            {pourWins ? labelPour ?? "Pour" : labelContre ?? "Contre"} l&apos;emporte !
          </p>
        )}
        <p className="mt-1 text-sm text-black/45 line-clamp-2">{text}</p>
      </div>

      {questionType === "pour_contre" && (
        <div className="grid grid-cols-2 gap-2">
          <div
            className={cn(
              "rounded-xl px-3 py-4 text-center",
              pourWins ? "bg-black text-white" : "bg-black/5"
            )}
          >
            <p className="text-xs uppercase tracking-wider opacity-70">{labelPour ?? "Pour"}</p>
            <p className="text-2xl font-bold">{pour}</p>
          </div>
          <div
            className={cn(
              "rounded-xl px-3 py-4 text-center",
              !pourWins ? "bg-black text-white" : "bg-black/5"
            )}
          >
            <p className="text-xs uppercase tracking-wider opacity-70">{labelContre ?? "Contre"}</p>
            <p className="text-2xl font-bold">{contre}</p>
          </div>
        </div>
      )}

      {podium.length > 0 && questionType !== "pour_contre" && (
        <ol className="space-y-2">
          {podium.map((entry, i) => (
            <li
              key={entry.player_id}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                i === 0 ? "bg-black text-white" : i === 1 ? "bg-black/10" : "bg-black/5"
              )}
            >
              <span className="font-medium">
                {MEDALS[i] ?? `${i + 1}.`} {entry.pseudo}
              </span>
              <span className={cn("tabular-nums", i === 0 ? "text-white/80" : "text-black/45")}>
                {entry.vote_count} vote{entry.vote_count > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}

      {questionType === "finger_point" && fingerVotes.length > 0 && (
        <div className="rounded-xl bg-black/[0.03] px-3 py-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/45">Qui a pointé qui</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-black/60">
            {fingerVotes.map((v, i) => (
              <li key={i}>
                <span className="font-medium text-black/80">{v.from_pseudo}</span>
                {" → "}
                <span className="font-medium text-black/80">{v.to_pseudo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
