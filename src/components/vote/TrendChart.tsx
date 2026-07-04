"use client";

import { motion } from "framer-motion";
import { CHOICE_CONFIG } from "@/lib/constants";
import { getOptionLabel, normalizeQuestionOptions, VOTE_CHOICE_ORDER } from "@/lib/question-options";
import type { QuestionOption, QuestionResults, VoteChoice } from "@/types";
import { cn } from "@/lib/utils";

interface TrendChartProps {
  results: QuestionResults;
  options?: QuestionOption[];
  myVote?: VoteChoice | null;
  title?: string;
  variant?: "light" | "dark";
}

export function TrendChart({
  results,
  options: optionsProp,
  myVote,
  title = "Résultats",
  variant = "light",
}: TrendChartProps) {
  const options = normalizeQuestionOptions(optionsProp);
  const isDark = variant === "dark";

  const pctByChoice: Record<VoteChoice, number> = {
    pour: results.pctPour,
    contre: results.pctContre,
    neutre: results.pctNeutre,
  };
  const votesByChoice: Record<VoteChoice, number> = {
    pour: results.pour,
    contre: results.contre,
    neutre: results.neutre,
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-foreground")}>{title}</h3>
        <span
          className={cn(
            "text-sm tabular-nums transition-all duration-300",
            isDark ? "text-white/50" : "text-muted-foreground"
          )}
        >
          {Math.round(results.total).toLocaleString("fr-FR")} votes
        </span>
      </div>

      <div className="space-y-2.5">
        {VOTE_CHOICE_ORDER.map((choice) => (
          <ResultBar
            key={choice}
            label={getOptionLabel(options, choice)}
            pct={pctByChoice[choice]}
            votes={votesByChoice[choice]}
            isMine={myVote === choice}
            isDark={isDark}
            fillColor={isDark ? "#ffffff" : CHOICE_CONFIG[choice].from}
          />
        ))}
      </div>
    </div>
  );
}

function ResultBar({
  label,
  pct,
  votes,
  isMine,
  isDark,
  fillColor,
}: {
  label: string;
  pct: number;
  votes: number;
  isMine: boolean;
  isDark: boolean;
  fillColor: string;
}) {
  const displayPct = pct.toFixed(1);
  const barWidth = pct > 0 ? Math.max(pct, 14) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        isMine && (isDark ? "rounded-lg ring-1 ring-white/50 ring-offset-2 ring-offset-black" : "rounded-lg ring-1 ring-black ring-offset-2")
      )}
    >
      <div
        className={cn(
          "relative h-10 min-w-0 flex-1 overflow-hidden rounded-lg",
          isDark ? "bg-white/12" : "bg-black/6"
        )}
      >
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center justify-between gap-2 px-3"
          style={{ backgroundColor: fillColor }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <span
            className={cn(
              "min-w-0 truncate text-sm font-medium",
              isDark ? "text-black" : "text-white"
            )}
          >
            {label}
            {isMine && <span className="font-normal opacity-70"> · toi</span>}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              isDark ? "text-black" : "text-white"
            )}
          >
            {displayPct}%
          </span>
        </motion.div>

        {pct === 0 && (
          <div className="absolute inset-0 flex items-center justify-between gap-2 px-3">
            <span className={cn("min-w-0 truncate text-sm font-medium", isDark ? "text-white/55" : "text-muted-foreground")}>
              {label}
            </span>
            <span className={cn("shrink-0 text-sm tabular-nums", isDark ? "text-white/40" : "text-muted-foreground")}>
              0%
            </span>
          </div>
        )}
      </div>

      <span
        className={cn(
          "w-14 shrink-0 text-right text-[10px] leading-tight tabular-nums",
          isDark ? "text-white/45" : "text-muted-foreground"
        )}
      >
        {Math.round(votes).toLocaleString("fr-FR")} v.
      </span>
    </div>
  );
}
