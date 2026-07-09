"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getOptionLabel, isSymbolLabel, normalizeQuestionOptions, VOTE_CHOICE_ORDER } from "@/lib/question-options";
import { triggerHaptic } from "@/lib/capacitor";
import type { QuestionOption, VoteChoice } from "@/types";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  options?: QuestionOption[];
  onVote: (choice: VoteChoice) => void;
  disabled?: boolean;
  selected?: VoteChoice | null;
}

export function VoteButtons({ options: optionsProp, onVote, disabled, selected }: VoteButtonsProps) {
  const options = normalizeQuestionOptions(optionsProp);
  const [pressed, setPressed] = useState<VoteChoice | null>(null);

  const handleVote = (choice: VoteChoice) => {
    if (disabled) return;
    setPressed(choice);
    void triggerHaptic("light");
    onVote(choice);
    setTimeout(() => setPressed(null), 200);
  };

  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-3">
      {VOTE_CHOICE_ORDER.map((choice) => {
        const label = getOptionLabel(options, choice);
        const symbolOnly = isSymbolLabel(label);
        const isSelected = selected === choice;
        const isPressed = pressed === choice;

        return (
          <motion.button
            key={choice}
            type="button"
            disabled={disabled}
            onClick={() => handleVote(choice)}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-full border px-4 py-4 text-sm font-medium transition-colors",
              symbolOnly ? "text-2xl sm:text-3xl" : "text-sm",
              isSelected
                ? "border-white bg-white text-black"
                : "border-white/35 bg-transparent text-white hover:border-white/60",
              disabled && !isSelected && "cursor-not-allowed opacity-40",
              isPressed && "scale-[0.97]"
            )}
          >
            <span className="leading-tight">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
