"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
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

  const chartData = VOTE_CHOICE_ORDER.map((choice) => ({
    choice,
    label: getOptionLabel(options, choice),
    pct: pctByChoice[choice],
    fill: isDark ? "#ffffff" : CHOICE_CONFIG[choice].from,
  }));

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-foreground")}>{title}</h3>
        <AnimatedTotal total={results.total} isDark={isDark} />
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" hide />
            <Bar dataKey="pct" radius={[4, 4, 4, 4]} isAnimationActive animationDuration={900} animationEasing="ease-out">
              {chartData.map((entry) => (
                <Cell key={entry.choice} fill={entry.fill} fillOpacity={isDark ? 0.85 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {VOTE_CHOICE_ORDER.map((choice) => (
          <ChoiceRow
            key={choice}
            label={getOptionLabel(options, choice)}
            pct={pctByChoice[choice]}
            votes={votesByChoice[choice]}
            isMine={myVote === choice}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

function AnimatedTotal({ total, isDark }: { total: number; isDark: boolean }) {
  return (
    <span className={cn("text-sm tabular-nums transition-all duration-300", isDark ? "text-white/50" : "text-muted-foreground")}>
      {Math.round(total).toLocaleString("fr-FR")} votes
    </span>
  );
}

function ChoiceRow({
  label,
  pct,
  votes,
  isMine,
  isDark,
}: {
  label: string;
  pct: number;
  votes: number;
  isMine: boolean;
  isDark: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-3",
        isDark ? "bg-white/8" : "border border-border bg-muted/30",
        isMine && (isDark ? "ring-1 ring-white/60" : "ring-1 ring-black")
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium">
        <span className={cn("truncate", isDark ? "text-white" : "text-foreground")}>
          {label} {isMine && "· ton vote"}
        </span>
        <span className={cn("shrink-0 tabular-nums transition-all duration-300", isDark ? "text-white/70" : "text-muted-foreground")}>
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className={cn("h-1.5 w-full overflow-hidden rounded-full", isDark ? "bg-white/15" : "bg-black/8")}>
        <motion.div
          className={cn("h-full rounded-full", isDark ? "bg-white" : "bg-black")}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <p className={cn("mt-1 text-right text-[11px] tabular-nums transition-all duration-300", isDark ? "text-white/45" : "text-muted-foreground")}>
        {Math.round(votes).toLocaleString("fr-FR")} votes
      </p>
    </div>
  );
}
