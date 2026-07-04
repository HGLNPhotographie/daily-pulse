import type { Question, QuestionOption, VoteChoice } from "@/types";

export const VOTE_CHOICE_ORDER: VoteChoice[] = ["pour", "neutre", "contre"];

export const DEFAULT_QUESTION_OPTIONS: QuestionOption[] = [
  { key: "pour", label: "POUR" },
  { key: "neutre", label: "NEUTRE" },
  { key: "contre", label: "CONTRE" },
];

/** Préréglages rapides pour l'éditeur admin. */
export const OPTION_PRESETS: { name: string; options: QuestionOption[] }[] = [
  { name: "Classique", options: DEFAULT_QUESTION_OPTIONS },
  {
    name: "Emojis",
    options: [
      { key: "pour", label: "👍" },
      { key: "neutre", label: "🤷" },
      { key: "contre", label: "👎" },
    ],
  },
  {
    name: "Flèches",
    options: [
      { key: "pour", label: "↑" },
      { key: "neutre", label: "→" },
      { key: "contre", label: "↓" },
    ],
  },
  {
    name: "Oui / Non",
    options: [
      { key: "pour", label: "OUI" },
      { key: "neutre", label: "PEUT-ÊTRE" },
      { key: "contre", label: "NON" },
    ],
  },
];

export function normalizeQuestionOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw) || raw.length !== 3) return [...DEFAULT_QUESTION_OPTIONS];
  return VOTE_CHOICE_ORDER.map((key, i) => {
    const item = raw[i] as { key?: string; label?: string } | undefined;
    const label =
      typeof item?.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 32)
        : DEFAULT_QUESTION_OPTIONS[i].label;
    return { key, label };
  });
}

export function withQuestionOptions<T extends Question>(question: T): T & { options: QuestionOption[] } {
  return { ...question, options: normalizeQuestionOptions(question.options) };
}

export function getOptionLabel(options: QuestionOption[] | undefined, key: VoteChoice): string {
  return options?.find((o) => o.key === key)?.label ?? DEFAULT_QUESTION_OPTIONS.find((o) => o.key === key)!.label;
}

/** Libellé court (emoji / symbole) → affichage sans icône Lucide sur le buzzer. */
export function isSymbolLabel(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length === 0) return false;
  // Mots en lettres (POUR, OUI, etc.) → toujours afficher l'icône associée
  if (/^[a-zA-ZÀ-ÿ]+$/u.test(trimmed)) return false;
  if (trimmed.length <= 4) return true;
  return /^[\p{Emoji}\p{Symbol}\p{Punctuation}\s↑↓→←↔+−]+$/u.test(trimmed);
}

export function formatResultsSummary(
  q: Pick<Question, "total_pour" | "total_neutre" | "total_contre" | "options">
): string {
  const options = normalizeQuestionOptions(q.options);
  const totals = { pour: q.total_pour, neutre: q.total_neutre, contre: q.total_contre };
  return VOTE_CHOICE_ORDER.map((key) => {
    const total = totals[key];
    const pct = q.total_pour + q.total_neutre + q.total_contre === 0 ? 0 : Math.round((total / (q.total_pour + q.total_neutre + q.total_contre)) * 1000) / 10;
    return `${pct}% ${getOptionLabel(options, key)}`;
  }).join(" / ");
}
