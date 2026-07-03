"use client";

import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";
import { COUNTDOWN_URGENT_THRESHOLD, VOTE_WINDOW_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CountdownShowTVProps {
  expiresAt: string;
  onExpire?: () => void;
}

/**
 * Compte à rebours "Jeu Télévisé" : digits façon afficheur LED, anneau de
 * progression, pulsation qui s'accélère dans les 30 dernières secondes.
 */
export function CountdownShowTV({ expiresAt, onExpire }: CountdownShowTVProps) {
  const { secondsLeft, progress, isExpired, isUrgent, formatted } = useCountdown(
    expiresAt,
    VOTE_WINDOW_SECONDS,
    COUNTDOWN_URGENT_THRESHOLD
  );

  if (isExpired && onExpire) onExpire();

  const pulseDuration = isUrgent ? Math.max(0.25, secondsLeft / 30) : 1.2;
  const ringColor = isUrgent ? "#FF2D78" : "#00F5D4";

  const circumference = 2 * Math.PI * 46;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <motion.div
        className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40"
        animate={{ scale: isUrgent ? [1, 1.06, 1] : 1 }}
        transition={{ duration: pulseDuration, repeat: isUrgent ? Infinity : 0, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={ringColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </svg>

        <div
          className={cn(
            "font-display flex items-baseline gap-0.5 rounded-xl px-3 py-2 text-4xl tabular-nums tracking-wider sm:text-5xl",
            "bg-black/60"
          )}
          style={{
            color: ringColor,
            textShadow: `0 0 10px ${ringColor}, 0 0 24px ${ringColor}80`,
          }}
        >
          {formatted}
        </div>
      </motion.div>

      <motion.p
        key={isUrgent ? "urgent" : "calm"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "text-xs font-bold uppercase tracking-[0.3em]",
          isUrgent ? "text-[#FF2D78]" : "text-muted-foreground"
        )}
      >
        {isExpired ? "Temps écoulé" : isUrgent ? "Dépêche-toi !" : "Temps restant"}
      </motion.p>
    </div>
  );
}
