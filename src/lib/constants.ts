import type { VoteChoice } from "@/types";

/** Durée de la fenêtre de vote (le "Défi"), en secondes. */
export const VOTE_WINDOW_SECONDS = 5 * 60;

/** En dessous de ce seuil restant, le countdown passe en mode "urgence" (accélération, rouge vif). */
export const COUNTDOWN_URGENT_THRESHOLD = 30;

export const CHOICE_CONFIG: Record<
  VoteChoice,
  { label: string; short: string; neon: string; glow: string; from: string; to: string }
> = {
  pour: {
    label: "POUR",
    short: "P",
    neon: "#00F5D4",
    glow: "shadow-[0_0_25px_rgba(0,245,212,0.65)]",
    from: "#00F5D4",
    to: "#00B8A9",
  },
  neutre: {
    label: "NEUTRE",
    short: "N",
    neon: "#FACC15",
    glow: "shadow-[0_0_25px_rgba(250,204,21,0.65)]",
    from: "#FACC15",
    to: "#F59E0B",
  },
  contre: {
    label: "CONTRE",
    short: "C",
    neon: "#FF2D78",
    glow: "shadow-[0_0_25px_rgba(255,45,120,0.65)]",
    from: "#FF2D78",
    to: "#C4185C",
  },
};

/** Paliers visuels de la Flamme en fonction du streak courant. */
export const STREAK_TIERS = [
  { min: 60, name: "Légendaire", colors: ["#7DF9FF", "#3B82F6", "#A855F7"] },
  { min: 30, name: "Dorée", colors: ["#FFE066", "#FFB800", "#FF8C00"] },
  { min: 14, name: "Ardente", colors: ["#FF7A00", "#FF3D00", "#FF0044"] },
  { min: 3, name: "Vive", colors: ["#FFB703", "#FB5607", "#FF006E"] },
  { min: 0, name: "Naissante", colors: ["#FDBA74", "#FB923C", "#EF4444"] },
] as const;

export function getStreakTier(streak: number) {
  return STREAK_TIERS.find((tier) => streak >= tier.min) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
}
