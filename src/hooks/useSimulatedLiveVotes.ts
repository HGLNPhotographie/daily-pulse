"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeDeterministicFakeCounts,
  getSimulatedPulseIndex,
  lerpFakeVoteCounts,
  mergeResultsWithSimulatedVotes,
  monotoneFakeVoteCounts,
  SIMULATED_PULSE_ANIMATION_MS,
  type FakeVoteCounts,
} from "@/lib/simulated-live-votes";
import type { Question, QuestionResults } from "@/types";
import { computeResults } from "@/types";

const EMPTY_FAKE: FakeVoteCounts = { pour: 0, neutre: 0, contre: 0 };
const SYNC_TICK_MS = 250;

/**
 * Votes fictifs synchronisés entre tous les utilisateurs (calcul déterministe).
 * +10 à +1300 votants toutes les 5 s depuis `active_at`, animation locale entre les vagues.
 */
export function useSimulatedLiveVotes(
  question: Question | null,
  enabled = true
): { displayResults: QuestionResults; displayTotal: number } {
  const [displayFake, setDisplayFake] = useState<FakeVoteCounts>(EMPTY_FAKE);
  const displayRef = useRef<FakeVoteCounts>(EMPTY_FAKE);
  const questionIdRef = useRef<string | null>(null);
  const pulseIndexRef = useRef<number>(-1);
  const syncRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = displayFake;
  }, [displayFake]);

  useEffect(() => {
    if (syncRef.current) window.clearInterval(syncRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (!question || !enabled) {
      questionIdRef.current = null;
      pulseIndexRef.current = -1;
      displayRef.current = EMPTY_FAKE;
      setDisplayFake(EMPTY_FAKE);
      return;
    }

    const animateToTarget = (to: FakeVoteCounts) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const from = displayRef.current;
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

    const sync = () => {
      const now = Date.now();
      const pulseIndex = getSimulatedPulseIndex(question, now);
      const target = computeDeterministicFakeCounts(question, now);

      if (questionIdRef.current !== question.id) {
        questionIdRef.current = question.id;
        pulseIndexRef.current = pulseIndex;
        displayRef.current = target;
        setDisplayFake(target);
        return;
      }

      if (pulseIndex !== pulseIndexRef.current) {
        pulseIndexRef.current = pulseIndex;
        animateToTarget(target);
      }
    };

    sync();
    syncRef.current = window.setInterval(sync, SYNC_TICK_MS);

    return () => {
      if (syncRef.current) window.clearInterval(syncRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [question, enabled]);

  const displayResults = useMemo(() => {
    if (!question) {
      return computeResults({ total_pour: 0, total_contre: 0, total_neutre: 0 });
    }
    return mergeResultsWithSimulatedVotes(question, displayFake);
  }, [question, displayFake]);

  return { displayResults, displayTotal: displayResults.total };
}
