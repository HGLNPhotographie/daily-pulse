"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHOICE_CONFIG } from "@/lib/constants";
import { getOptionLabel, normalizeQuestionOptions, VOTE_CHOICE_ORDER } from "@/lib/question-options";
import { useCountUp } from "@/hooks/useCountUp";
import type { QuestionOption, QuestionResults, VoteChoice } from "@/types";
import { cn } from "@/lib/utils";

interface TrendChartProps {
  results: QuestionResults;
  options?: QuestionOption[];
  myVote?: VoteChoice | null;
  title?: string;
}

export function TrendChart({ results, options: optionsProp, myVote, title = "RÉSULTATS EN DIRECT" }: TrendChartProps) {
  const options = normalizeQuestionOptions(optionsProp);

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
    fill: CHOICE_CONFIG[choice].from,
  }));

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl tracking-wide text-glow-cyan">{title}</h3>
        <AnimatedTotal total={results.total} />
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" hide />
            <Bar dataKey="pct" radius={[8, 8, 8, 8]} isAnimationActive animationDuration={900} animationEasing="ease-out">
              {chartData.map((entry) => (
                <Cell key={entry.choice} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {VOTE_CHOICE_ORDER.map((choice, i) => (
          <ChoiceRow
            key={choice}
            choice={choice}
            label={getOptionLabel(options, choice)}
            pct={pctByChoice[choice]}
            votes={votesByChoice[choice]}
            isMine={myVote === choice}
            delay={i * 0.08}
          />
        ))}
      </div>
    </div>
  );
}

function AnimatedTotal({ total }: { total: number }) {
  const value = useCountUp(total);
  return (
    <span className="font-display text-lg text-muted-foreground">
      {Math.round(value).toLocaleString("fr-FR")} votes
    </span>
  );
}

function ChoiceRow({
  choice,
  label,
  pct,
  votes,
  isMine,
  delay,
}: {
  choice: VoteChoice;
  label: string;
  pct: number;
  votes: number;
  isMine: boolean;
  delay: number;
}) {
  const cfg = CHOICE_CONFIG[choice];
  const animatedPct = useCountUp(pct);
  const animatedVotes = useCountUp(votes);

  return (
    <div
      className={cn(
        "neo-border-sm relative overflow-hidden rounded-xl bg-card/70 p-3",
        isMine && "ring-2 ring-offset-2 ring-offset-background"
      )}
      style={isMine ? { boxShadow: `0 0 0 2px ${cfg.neon}` } : undefined}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm font-bold uppercase tracking-wider">
        <span className="truncate" style={{ color: cfg.neon }}>
          {label} {isMine && "· TON VOTE"}
        </span>
        <span className="shrink-0 tabular-nums text-foreground">{animatedPct.toFixed(1)}%</span>
      </div>

      <div className="h-4 w-full overflow-hidden rounded-full bg-black/40">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${cfg.from}, ${cfg.to})`, boxShadow: `0 0 12px ${cfg.neon}` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 14, delay }}
        />
      </div>

      <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
        {Math.round(animatedVotes).toLocaleString("fr-FR")} votes
      </p>
    </div>
  );
}
