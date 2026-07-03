"use client";

import { TrendChart } from "@/components/vote/TrendChart";
import { computeResults } from "@/types";
import type { Question } from "@/types";

interface PollResultsSummaryProps {
  question: Question;
  title?: string;
}

/** Résumé visuel des résultats d'un sondage (admin). */
export function PollResultsSummary({ question, title = "RÉSUMÉ DU SONDAGE" }: PollResultsSummaryProps) {
  const results = computeResults(question);

  return (
    <div className="rounded-xl border border-border/60 bg-black/20 p-4">
      <TrendChart results={results} options={question.options} title={title} />
    </div>
  );
}
