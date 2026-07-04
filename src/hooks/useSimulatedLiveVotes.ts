"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addGrowthToFakeCounts,
  fakeVotesTotal,
  lerpFakeVoteCounts,
  mergeResultsWithSimulatedVotes,
  monotoneFakeVoteCounts,
  pickInitialSimulatedVotes,
  pickNextGrowthBatch,
  SIMULATED_PULSE_ANIMATION_MS,
  SIMULATED_PULSE_INTERVAL_MS,
  type FakeVoteCounts,
} from "@/lib/simulated-live-votes";
import type { Question, QuestionResults } from "@/types";
import { computeResults } from "@/types";

const EMPTY_FAKE: FakeVoteCounts = { pour: 0, neutre: 0, contre: 0 };

/**
 * Votes fictifs côté client : départ aléatoire, puis +1 palier toutes les 5 s
 * (animation ~2,8 s, jamais à la baisse). N'affecte pas les stats admin.
 */
export function useSimulatedLiveVotes(
  question: Question | null,
  enabled = true
): { displayResults: QuestionResults; displayTotal: number } {
  const [displayFake, setDisplayFake] = useState<FakeVoteCounts>(EMPTY_FAKE);
  const targetRef = useRef<FakeVoteCounts>(EMPTY_FAKE);
  const displayRef = useRef<FakeVoteCounts>(EMPTY_FAKE);
  const questionIdRef = useRef<string | null>(null);
  const pulseRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = displayFake;
  }, [displayFake]);

  useEffect(() => {
    if (pulseRef.current) window.clearInterval(pulseRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (!question || !enabled) {
      questionIdRef.current = null;
      targetRef.current = EMPTY_FAKE;
      displayRef.current = EMPTY_FAKE;
      setDisplayFake(EMPTY_FAKE);
      return;
    }

    const animateToTarget = (from: FakeVoteCounts, to: FakeVoteCounts) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();

      const frame = (now: number) => {
        const progress = (now - start) / SIMULATED_PULSE_ANIMATION_MS;
        const next = lerpFakeVoteCounts(from, to, progress);
        const monotone = monotoneFakeVoteCounts(displayRef.current, next);
        displayRef.current = monotone;
        setDisplayFake(monotone);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          const finalCounts = monotoneFakeVoteCounts(displayRef.current, to);
          displayRef.current = finalCounts;
          setDisplayFake(finalCounts);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(frame);
    };

    const pulse = () => {
      const currentTarget = targetRef.current;
      const batch = pickNextGrowthBatch(fakeVotesTotal(currentTarget));
      const nextTarget = addGrowthToFakeCounts(currentTarget, batch);
      targetRef.current = nextTarget;
      animateToTarget(displayRef.current, nextTarget);
    };

    if (questionIdRef.current !== question.id) {
      questionIdRef.current = question.id;
      const initial = pickInitialSimulatedVotes();
      targetRef.current = initial;
      displayRef.current = initial;
      setDisplayFake(initial);
    }

    pulseRef.current = window.setInterval(pulse, SIMULATED_PULSE_INTERVAL_MS);

    return () => {
      if (pulseRef.current) window.clearInterval(pulseRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [question?.id, enabled]);

  const displayResults = useMemo(() => {
    if (!question) {
      return computeResults({ total_pour: 0, total_contre: 0, total_neutre: 0 });
    }
    return mergeResultsWithSimulatedVotes(question, displayFake);
  }, [question, displayFake]);

  return { displayResults, displayTotal: displayResults.total };
}
