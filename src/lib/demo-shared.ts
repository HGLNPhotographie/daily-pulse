import { VOTE_WINDOW_SECONDS } from "@/lib/constants";

export const DEMO_QUESTIONS = [
  "Le télétravail devrait-il devenir un droit garanti par la loi ?",
  "Faut-il interdire les réseaux sociaux aux moins de 16 ans ?",
  "L'intelligence artificielle va-t-elle créer plus d'emplois qu'elle n'en détruit ?",
  "La semaine de 4 jours devrait-elle être généralisée ?",
  "Le vote devrait-il être obligatoire ?",
];

export function pickQuestionText() {
  const idx = Math.floor(Date.now() / 86_400_000) % DEMO_QUESTIONS.length;
  return DEMO_QUESTIONS[idx];
}

export function seedRandomCounts() {
  return {
    total_pour: Math.floor(Math.random() * 40) + 10,
    total_contre: Math.floor(Math.random() * 30) + 5,
    total_neutre: Math.floor(Math.random() * 20) + 5,
  };
}

/** Compatible HTTP LAN (iPhone) où `crypto.randomUUID` n'est pas dispo hors HTTPS. */
export function createDemoId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export { VOTE_WINDOW_SECONDS };
