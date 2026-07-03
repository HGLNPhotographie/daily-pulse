"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ThumbsDown, ThumbsUp, Minus } from "lucide-react";
import { CHOICE_CONFIG } from "@/lib/constants";
import { triggerHaptic } from "@/lib/capacitor";
import type { VoteChoice } from "@/types";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  onVote: (choice: VoteChoice) => void;
  disabled?: boolean;
  selected?: VoteChoice | null;
}

const ICONS: Record<VoteChoice, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  pour: ThumbsUp,
  neutre: Minus,
  contre: ThumbsDown,
};

/**
 * Boutons de vote massifs façon buzzer de jeu télévisé : enfoncement 3D au
 * clic, micro-vibration mobile, éclat de particules colorées à la validation.
 */
export function VoteButtons({ onVote, disabled, selected }: VoteButtonsProps) {
  const [pressed, setPressed] = useState<VoteChoice | null>(null);

  const handleVote = (choice: VoteChoice, event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    setPressed(choice);
    void triggerHaptic("light");

    const rect = event.currentTarget.getBoundingClientRect();
    confetti({
      particleCount: 40,
      spread: 60,
      startVelocity: 32,
      gravity: 1.1,
      scalar: 0.8,
      colors: [CHOICE_CONFIG[choice].from, CHOICE_CONFIG[choice].to, "#ffffff"],
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
    });

    onVote(choice);
    setTimeout(() => setPressed(null), 250);
  };

  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-3">
      {(Object.keys(CHOICE_CONFIG) as VoteChoice[]).map((choice) => {
        const cfg = CHOICE_CONFIG[choice];
        const Icon = ICONS[choice];
        const isSelected = selected === choice;
        const isPressed = pressed === choice;

        return (
          <motion.button
            key={choice}
            type="button"
            disabled={disabled}
            onClick={(e) => handleVote(choice, e)}
            whileTap={disabled ? undefined : { scale: 0.92, y: 6 }}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2 rounded-2xl border-[3px] px-4 py-6 font-display text-xl tracking-wider transition-all sm:text-2xl",
              "active:translate-y-1.5",
              disabled && !isSelected && "cursor-not-allowed opacity-40",
              isSelected ? "border-white" : "border-black/40"
            )}
            style={{
              background: `linear-gradient(160deg, ${cfg.from}, ${cfg.to})`,
              color: "#0a0612",
              boxShadow: isPressed
                ? `0 2px 0 0 rgba(0,0,0,0.7), 0 0 20px ${cfg.neon}99`
                : `0 8px 0 0 rgba(0,0,0,0.7), 0 0 25px ${cfg.neon}66`,
            }}
          >
            <Icon className="h-7 w-7" strokeWidth={3} />
            <span>{cfg.label}</span>
            {isSelected && (
              <motion.span
                layoutId="vote-selected-ring"
                className="absolute -inset-1 rounded-2xl border-2 border-white"
                style={{ boxShadow: `0 0 20px ${cfg.neon}` }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
