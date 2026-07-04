import type { Question, QuestionResults, VoteChoice } from "@/types";
import { computeResults } from "@/types";

/**
 * Votes simulés affichés côté client — jamais persistés ni comptés en admin.
 * Calcul déterministe (question + temps) : identique pour tous les utilisateurs.
 */
export const SIMULATED_PULSE_INTERVAL_MS = 5_000;
export const SIMULATED_PULSE_ANIMATION_MS = 2_800;
export const SIMULATED_INITIAL_MIN = 96;
export const SIMULATED_INITIAL_MAX = 520;
export const SIMULATED_PULSE_INCREMENT_MIN = 10;
export const SIMULATED_PULSE_INCREMENT_MAX = 1_300;

export type FakeVoteCounts = Record<VoteChoice, number>;

const EMPTY_FAKE: FakeVoteCounts = { pour: 0, neutre: 0, contre: 0 };

function fnv1a(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unitRandom(questionId: string, salt: string): number {
  const rand = mulberry32(fnv1a(`${questionId}::${salt}`));
  return rand();
}

/** Entier pseudo-aléatoire stable pour une question et une clé données. */
export function seededInt(questionId: string, salt: string, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(unitRandom(questionId, salt) * (hi - lo + 1));
}

/** Répartit un total fictif entre les trois choix, de façon déterministe. */
export function splitFakeVotesTotalDeterministic(questionId: string, salt: string, total: number): FakeVoteCounts {
  const safeTotal = Math.max(0, Math.round(total));
  if (safeTotal === 0) return { ...EMPTY_FAKE };

  const w1 = unitRandom(questionId, `${salt}:w1`) + 0.12;
  const w2 = unitRandom(questionId, `${salt}:w2`) + 0.12;
  const w3 = unitRandom(questionId, `${salt}:w3`) + 0.12;
  const sum = w1 + w2 + w3;
  const pour = Math.floor((safeTotal * w1) / sum);
  const neutre = Math.floor((safeTotal * w2) / sum);
  const contre = safeTotal - pour - neutre;
  return { pour, neutre, contre };
}

export function fakeVotesTotal(counts: FakeVoteCounts): number {
  return counts.pour + counts.neutre + counts.contre;
}

function addFakeVoteCounts(a: FakeVoteCounts, b: FakeVoteCounts): FakeVoteCounts {
  return {
    pour: a.pour + b.pour,
    neutre: a.neutre + b.neutre,
    contre: a.contre + b.contre,
  };
}

/** Index de la vague courante, ancré sur `active_at` (UTC). */
export function getSimulatedPulseIndex(question: Pick<Question, "active_at">, nowMs = Date.now()): number {
  const activeMs = new Date(question.active_at).getTime();
  if (nowMs < activeMs) return -1;
  return Math.floor((nowMs - activeMs) / SIMULATED_PULSE_INTERVAL_MS);
}

/**
 * Totaux fictifs globaux à un instant T — mêmes chiffres pour tous les clients
 * ayant la même question et la même horloge (±5 s).
 */
export function computeDeterministicFakeCounts(
  question: Pick<Question, "id" | "active_at">,
  nowMs = Date.now()
): FakeVoteCounts {
  const pulseIndex = getSimulatedPulseIndex(question, nowMs);
  if (pulseIndex < 0) return { ...EMPTY_FAKE };

  let counts = splitFakeVotesTotalDeterministic(
    question.id,
    "initial-split",
    seededInt(question.id, "initial", SIMULATED_INITIAL_MIN, SIMULATED_INITIAL_MAX)
  );

  for (let pulse = 1; pulse <= pulseIndex; pulse++) {
    const increment = seededInt(
      question.id,
      `pulse-${pulse}`,
      SIMULATED_PULSE_INCREMENT_MIN,
      SIMULATED_PULSE_INCREMENT_MAX
    );
    counts = addFakeVoteCounts(counts, splitFakeVotesTotalDeterministic(question.id, `pulse-split-${pulse}`, increment));
  }

  return counts;
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

/** Garantit que l'affichage ne descend jamais entre deux images. */
export function monotoneFakeVoteCounts(prev: FakeVoteCounts, next: FakeVoteCounts): FakeVoteCounts {
  return maxFakeVoteCounts(prev, next);
}
