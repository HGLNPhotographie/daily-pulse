"use client";

import { CHOICE_CONFIG } from "@/lib/constants";
import {
  DEFAULT_QUESTION_OPTIONS,
  OPTION_PRESETS,
} from "@/lib/question-options";
import type { QuestionOption, VoteChoice } from "@/types";

const ORDER: VoteChoice[] = ["pour", "neutre", "contre"];

const SLOT_HINTS: Record<VoteChoice, string> = {
  pour: "Choix positif / oui",
  neutre: "Choix neutre / mitigé",
  contre: "Choix négatif / non",
};

interface PollOptionsEditorProps {
  value: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
}

export function PollOptionsEditor({ value, onChange }: PollOptionsEditorProps) {
  const options = value.length === 3 ? value : [...DEFAULT_QUESTION_OPTIONS];

  const updateLabel = (key: VoteChoice, label: string) => {
    onChange(options.map((o) => (o.key === key ? { ...o, label: label.slice(0, 32) } : o)));
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Options du sondage</p>
        <div className="flex flex-wrap gap-1.5">
          {OPTION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.options.map((o) => ({ ...o })))}
              className="rounded-lg border border-border bg-card/80 px-2 py-1 text-[11px] font-semibold hover:bg-muted"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {ORDER.map((key) => {
          const cfg = CHOICE_CONFIG[key];
          const option = options.find((o) => o.key === key)!;
          return (
            <label key={key} className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.neon }}>
                {SLOT_HINTS[key]}
              </span>
              <input
                type="text"
                maxLength={32}
                value={option.label}
                onChange={(e) => updateLabel(key, e.target.value)}
                placeholder={DEFAULT_QUESTION_OPTIONS.find((o) => o.key === key)?.label}
                className="w-full rounded-lg border border-border bg-background/70 px-2.5 py-2 text-sm font-semibold outline-none ring-primary/40 focus:ring-2"
                style={{ boxShadow: `inset 0 0 0 1px ${cfg.neon}22` }}
              />
            </label>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Mots, emojis ou symboles (ex. ↑ → ↓). Les couleurs restent associées à chaque position.
      </p>
    </div>
  );
}

export { DEFAULT_QUESTION_OPTIONS };
