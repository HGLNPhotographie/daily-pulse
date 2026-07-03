"use client";

import { useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import confetti from "canvas-confetti";
import { getStreakTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StreakFlameProps {
  streak: number;
  size?: "sm" | "md" | "lg" | "xl";
  showNumber?: boolean;
  /** Déclenche une pluie de confettis (ex: à l'instant où le streak vient d'augmenter). */
  celebrate?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 56, font: "text-xl" },
  md: { box: 92, font: "text-3xl" },
  lg: { box: 140, font: "text-5xl" },
  xl: { box: 200, font: "text-7xl" },
} as const;

/**
 * Flamme vectorielle 100% animée (boucle de feu fluide via Framer Motion).
 * Change de palette de couleurs selon les paliers de streak (voir
 * `STREAK_TIERS`) : orange naissante -> rouge ardente -> or -> bleu/violet
 * légendaire au-delà de 60 jours.
 */
export function StreakFlame({ streak, size = "md", showNumber = true, celebrate = false, className }: StreakFlameProps) {
  const tier = getStreakTier(streak);
  const { box, font } = SIZE_MAP[size];
  const hasCelebrated = useRef(false);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!celebrate || hasCelebrated.current) return;
    hasCelebrated.current = true;
    const [c1, c2, c3] = tier.colors;
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 45,
      colors: [c1, c2, c3],
      origin: { y: 0.6 },
    });
  }, [celebrate, tier.colors]);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative flex items-end justify-center" style={{ width: box, height: box * 1.15 }}>
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={`flame-outer-${gradientId}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={tier.colors[2]} />
              <stop offset="55%" stopColor={tier.colors[1]} />
              <stop offset="100%" stopColor={tier.colors[0]} />
            </linearGradient>
            <linearGradient id={`flame-mid-${gradientId}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={tier.colors[1]} />
              <stop offset="60%" stopColor={tier.colors[0]} />
              <stop offset="100%" stopColor="#fff7d6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Halo diffus derrière la flamme */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: tier.colors[1] }}
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.85, 1.05, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Couche externe : silhouette complète, mouvement large et lent */}
        <motion.div
          className="absolute inset-0 origin-bottom"
          animate={{
            scaleY: [1, 1.06, 0.96, 1.04, 1],
            scaleX: [1, 0.94, 1.05, 0.97, 1],
            rotate: [-2, 2, -1, 2, -2],
          }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame
            width="100%"
            height="100%"
            fill={`url(#flame-outer-${gradientId})`}
            stroke="none"
            style={{ filter: `drop-shadow(0 0 10px ${tier.colors[1]}aa)` }}
          />
        </motion.div>

        {/* Couche médiane : plus fine, déphasée, en lumière additive */}
        <motion.div
          className="absolute inset-x-[22%] inset-y-[10%] origin-bottom mix-blend-screen"
          animate={{
            scaleY: [1, 0.92, 1.08, 0.97, 1],
            scaleX: [1, 1.08, 0.9, 1.05, 1],
            rotate: [2, -3, 2, -2, 2],
          }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        >
          <Flame width="100%" height="100%" fill={`url(#flame-mid-${gradientId})`} stroke="none" />
        </motion.div>

        {/* Cœur incandescent : petit, rapide, très lumineux */}
        <motion.div
          className="absolute inset-x-[36%] inset-y-[28%] origin-bottom"
          animate={{
            scaleY: [1, 1.18, 0.85, 1.12, 1],
            scaleX: [1, 0.85, 1.12, 0.92, 1],
            opacity: [0.9, 1, 0.85, 1, 0.9],
          }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame width="100%" height="100%" fill="#fff7d6" stroke="none" />
        </motion.div>

        {/* Étincelles occasionnelles */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ left: `${30 + i * 20}%`, top: "10%", background: tier.colors[i % tier.colors.length] }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -box * 0.35, opacity: [0, 1, 0], x: [0, i % 2 === 0 ? 8 : -8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
      </div>

      {showNumber && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn("font-display leading-none tracking-wide", font)}
            style={{ color: tier.colors[0], textShadow: `0 0 16px ${tier.colors[1]}99` }}
          >
            {streak}
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {streak > 1 ? "jours" : "jour"} · {tier.name}
          </span>
        </div>
      )}
    </div>
  );
}
