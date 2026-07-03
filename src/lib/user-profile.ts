import type { AgeRange } from "@/types";

export const MIN_SIGNUP_AGE = 16;
export const PSEUDO_MIN_LENGTH = 2;
export const PSEUDO_MAX_LENGTH = 24;
export const PSEUDO_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "16-17": "16–17 ans",
  "18-24": "18–24 ans",
  "25-34": "25–34 ans",
  "35-44": "35–44 ans",
  "45-54": "45–54 ans",
  "55+": "55 ans et +",
};

export function normalizePseudo(raw: string): string {
  return raw.trim();
}

export function validatePseudo(pseudo: string): string | null {
  const value = normalizePseudo(pseudo);
  if (value.length < PSEUDO_MIN_LENGTH || value.length > PSEUDO_MAX_LENGTH) {
    return `Le pseudo doit faire entre ${PSEUDO_MIN_LENGTH} et ${PSEUDO_MAX_LENGTH} caractères.`;
  }
  if (!PSEUDO_PATTERN.test(value)) {
    return "Lettres, chiffres, tirets et underscores uniquement.";
  }
  return null;
}

export function computeAgeFromBirthDate(birthDate: string, now = new Date()): number | null {
  const parts = birthDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  const born = new Date(year, month - 1, day);
  if (born.getFullYear() !== year || born.getMonth() !== month - 1 || born.getDate() !== day) {
    return null;
  }
  let age = now.getFullYear() - year;
  const hadBirthday =
    now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

export function validateBirthDate(birthDate: string): string | null {
  if (!birthDate) return "Indique ta date de naissance.";
  const age = computeAgeFromBirthDate(birthDate);
  if (age === null) return "Date de naissance invalide.";
  if (age < MIN_SIGNUP_AGE) {
    return `Tu dois avoir au moins ${MIN_SIGNUP_AGE} ans pour t'inscrire.`;
  }
  if (age > 120) return "Date de naissance invalide.";
  return null;
}

export function formatSignupProfileError(message: string): string {
  if (message.includes("PSEUDO_TAKEN") || message.includes("users_pseudo_unique")) {
    return "Ce pseudo est déjà pris. Choisis-en un autre.";
  }
  if (message.includes("PSEUDO_INVALID")) {
    return "Pseudo invalide (2 à 24 caractères).";
  }
  if (message.includes("AGE_MINIMUM")) {
    return `Tu dois avoir au moins ${MIN_SIGNUP_AGE} ans pour t'inscrire.`;
  }
  if (message.includes("BIRTH_DATE_INVALID")) {
    return "Date de naissance invalide.";
  }
  return message;
}

export function ageRangeLabel(range: AgeRange | null | undefined): string {
  if (!range) return "—";
  return AGE_RANGE_LABELS[range];
}
