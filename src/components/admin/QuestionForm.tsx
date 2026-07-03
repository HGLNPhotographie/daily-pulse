"use client";

import { useState } from "react";
import { CalendarClock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PollOptionsEditor, DEFAULT_QUESTION_OPTIONS } from "@/components/admin/PollOptionsEditor";
import type { QuestionOption } from "@/types";

export interface QuestionFormValues {
  text: string;
  category: string;
  windowMinutes: number;
  scheduledAt: Date | null;
  options: QuestionOption[];
}

interface QuestionFormProps {
  onSubmit: (values: QuestionFormValues) => Promise<void>;
  submitLabel?: string;
}

const CATEGORIES = ["société", "tech", "sport", "culture", "politique", "insolite"];

export function QuestionForm({ onSubmit, submitLabel = "Publier maintenant" }: QuestionFormProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [options, setOptions] = useState<QuestionOption[]>([...DEFAULT_QUESTION_OPTIONS]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        text: text.trim(),
        category,
        windowMinutes,
        scheduledAt: scheduleEnabled && scheduledAt ? new Date(scheduledAt) : null,
        options: options.map((o) => ({ ...o, label: o.label.trim() || DEFAULT_QUESTION_OPTIONS.find((d) => d.key === o.key)!.label })),
      });
      setText("");
      setOptions([...DEFAULT_QUESTION_OPTIONS]);
      setScheduleEnabled(false);
      setScheduledAt("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="neo-border-sm space-y-3 rounded-2xl bg-card/70 p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="Ex : Le télétravail devrait-il devenir un droit garanti par la loi ?"
        className="w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
      />

      <PollOptionsEditor value={options} onChange={setOptions} />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm capitalize outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Fenêtre
          <input
            type="number"
            min={1}
            max={60}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            className="w-16 rounded-xl border border-border bg-background/60 px-2 py-2 text-sm outline-none"
          />
          min
        </label>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Planifier
        </label>

        {scheduleEnabled && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required={scheduleEnabled}
            className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none"
          />
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || text.trim().length < 5} className="w-full gap-2 sm:w-auto">
        {scheduleEnabled ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {isSubmitting ? "Envoi..." : scheduleEnabled ? "Planifier" : submitLabel}
      </Button>
    </form>
  );
}
