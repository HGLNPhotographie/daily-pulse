import type { SoireeSubscriptionTier } from "@/types/soiree";

export const SOIREE_LOBBY_TTL_MINUTES = 15;

export const SOIREE_TIER_LIMITS: Record<
  SoireeSubscriptionTier,
  { maxPlayers: number; maxQuestionsPerPlayer: number }
> = {
  free: { maxPlayers: 5, maxQuestionsPerPlayer: 5 },
  pro: { maxPlayers: 20, maxQuestionsPerPlayer: 15 },
};

export const SOIREE_ANSWER_SECONDS_MIN = 5;
export const SOIREE_ANSWER_SECONDS_MAX = 15;
export const SOIREE_ANSWER_SECONDS_DEFAULT = 10;

const SESSION_PREFIX = "kitsh:soiree-session:";

export function saveSoireeSession(partyId: string, data: {
  playerId: string;
  sessionSecret: string;
  pseudo: string;
  isHost: boolean;
  questionCount?: number;
}) {
  if (typeof window === "undefined") return;
  const existing = loadSoireeSession(partyId);
  window.localStorage.setItem(
    `${SESSION_PREFIX}${partyId}`,
    JSON.stringify({
      ...existing,
      ...data,
      questionCount: data.questionCount ?? existing?.questionCount ?? 0,
    })
  );
}

export function loadSoireeSession(partyId: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${SESSION_PREFIX}${partyId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      playerId: string;
      sessionSecret: string;
      pseudo: string;
      isHost: boolean;
      questionCount?: number;
    };
  } catch {
    return null;
  }
}

export function clearSoireeSession(partyId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${SESSION_PREFIX}${partyId}`);
}

export function buildSoireeJoinUrl(joinCode: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/soiree/join/${encodeURIComponent(joinCode.toUpperCase())}`;
}

export function parseSoireeJoinCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (/^[A-Z2-9]{6}$/.test(trimmed)) return trimmed;
  try {
    if (trimmed.startsWith("HTTP")) {
      const url = new URL(raw.trim());
      const parts = url.pathname.split("/").filter(Boolean);
      const joinIdx = parts.indexOf("join");
      if (joinIdx >= 0 && parts[joinIdx + 1]) return parts[joinIdx + 1].toUpperCase();
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function formatSoireeError(message: string): string {
  if (message.includes("SOIREE_HOST_ACCOUNT_REQUIRED")) {
    return "Connecte-toi avec un compte pour créer une partie.";
  }
  if (message.includes("SOIREE_PARTY_NOT_FOUND")) return "Partie introuvable.";
  if (message.includes("SOIREE_PARTY_EXPIRED")) return "Cette partie a expiré.";
  if (message.includes("SOIREE_PARTY_FULL")) return "La partie est complète.";
  if (message.includes("SOIREE_PARTY_ALREADY_STARTED")) return "La partie a déjà commencé.";
  if (message.includes("SOIREE_PSEUDO_INVALID")) return "Pseudo invalide (2–24 caractères).";
  if (message.includes("SOIREE_QUESTION_LIMIT")) return "Limite de questions atteinte.";
  if (message.includes("SOIREE_PLAYERS_NOT_READY")) return "Tous les joueurs n'ont pas terminé.";
  if (message.includes("SOIREE_NO_QUESTIONS")) return "Aucune question rédigée.";
  if (message.includes("SOIREE_VOTE_SELF")) return "Tu ne peux pas te choisir toi-même.";
  if (message.includes("SOIREE_ROUND_CLOSED")) return "Le temps est écoulé.";
  if (message.includes("SOIREE_ROUND_NOT_EXPIRED")) return "Le vote est encore ouvert.";
  if (message.includes("AUTH_REQUIRED")) return "Session requise.";
  return message;
}
