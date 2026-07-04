import type { Question, QuestionResults, VoteChoice } from "@/types";
import { computeResults } from "@/types";

/** Votes simulés affichés uniquement côté client — jamais persistés ni comptés en admin. */
export const SIMULATED_PULSE_INTERVAL_MS = 5_000;
export const SIMULATED_PULSE_ANIMATION_MS = 2_800;
export const SIMULATED_INITIAL_MIN = 96;
export const SIMULATED_INITIAL_MAX = 520;
export const SIMULATED_CEILING = 48_000;

export type FakeVoteCounts = Record<VoteChoice, number>;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Répartit un total fictif entre les trois choix. */
export function splitFakeVotesTotal(total: number): FakeVoteCounts {
  const safeTotal = Math.max(0, Math.round(total));
  if (safeTotal === 0) return { pour: 0, neutre: 0, contre: 0 };

  const w1 = Math.random() + 0.12;
  const w2 = Math.random() + 0.12;
  const w3 = Math.random() + 0.12;
  const sum = w1 + w2 + w3;
  const pour = Math.floor((safeTotal * w1) / sum);
  const neutre = Math.floor((safeTotal * w2) / sum);
  const contre = safeTotal - pour - neutre;
  return { pour, neutre, contre };
}

export function pickInitialSimulatedVotes(): FakeVoteCounts {
  return splitFakeVotesTotal(randomInt(SIMULATED_INITIAL_MIN, SIMULATED_INITIAL_MAX));
}

export function fakeVotesTotal(counts: FakeVoteCounts): number {
  return counts.pour + counts.neutre + counts.contre;
}

/** Taille du prochain palier — croît avec le total pour atteindre des milliers / dizaines de milliers. */
export function pickNextGrowthBatch(currentTotal: number): number {
  if (currentTotal >= SIMULATED_CEILING) return randomInt(120, 420);

  if (currentTotal < 600) return randomInt(90, 380);
  if (currentTotal < 2_500) return randomInt(280, 1_100);
  if (currentTotal < 8_000) return randomInt(900, 3_200);
  if (currentTotal < 20_000) return randomInt(2_200, 7_500);
  return randomInt(1_800, 6_000);
}

export function addGrowthToFakeCounts(current: FakeVoteCounts, addTotal: number): FakeVoteCounts {
  const delta = splitFakeVotesTotal(addTotal);
  return {
    pour: current.pour + delta.pour,
    neutre: current.neutre + delta.neutre,
    contre: current.contre + delta.contre,
  };
}

export function lerpFakeVoteCounts(from: FakeVoteCounts, to: FakeVoteCounts, progress: number): FakeVoteCounts {
  const t = Math.min(1, Math.max(0, progress));
  const ease = 1 - Math.pow(1 - t, 3);
  return {
    pour: Math.round(from.pour + (to.pour - from.pour) * ease),
    neutre: Math.round(from.neutre + (to.neutre - from.neutre) * ease),
    contre: Math.round(from.contre + (to.contre - from.contre) * ease),
  };
}

export function mergeResultsWithSimulatedVotes(
  real: Pick<Question, "total_pour" | "total_contre" | "total_neutre">,
  fake: FakeVoteCounts
): QuestionResults {
  return computeResults({
    total_pour: real.total_pour + fake.pour,
    total_contre: real.total_contre + fake.contre,
    total_neutre: real.total_neutre + fake.neutre,
  });
}

export function maxFakeVoteCounts(a: FakeVoteCounts, b: FakeVoteCounts): FakeVoteCounts {
  return {
    pour: Math.max(a.pour, b.pour),
    neutre: Math.max(a.neutre, b.neutre),
    contre: Math.max(a.contre, b.contre),
  };
}

/** Garantit que `next` ne descend jamais sous `prev` (affichage monotone). */
export function monotoneFakeVoteCounts(prev: FakeVoteCounts, next: FakeVoteCounts): FakeVoteCounts {
  return maxFakeVoteCounts(prev, next);
}
