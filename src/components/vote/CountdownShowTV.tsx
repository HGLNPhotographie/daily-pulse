"use client";

import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";
import { COUNTDOWN_URGENT_THRESHOLD, VOTE_WINDOW_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CountdownShowTVProps {
  expiresAt: string;
  onExpire?: () => void;
}

export function CountdownShowTV({ expiresAt, onExpire }: CountdownShowTVProps) {
  const { secondsLeft, progress, isExpired, isUrgent, formatted } = useCountdown(
    expiresAt,
    VOTE_WINDOW_SECONDS,
    COUNTDOWN_URGENT_THRESHOLD
  );

  if (isExpired && onExpire) onExpire();

  const circumference = 2 * Math.PI * 44;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </svg>
        <span
          className={cn(
            "font-mono text-3xl tabular-nums tracking-tight",
            isUrgent ? "text-white" : "text-white/90"
          )}
        >
          {formatted}
        </span>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
        {isExpired ? "Temps écoulé" : "Restant"}
      </p>
    </div>
  );
}
