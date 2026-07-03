"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface NewQuestionBannerProps {
  onAccept: () => void;
  autoAcceptSeconds?: number;
}

/**
 * Bannière "Show TV" annonçant qu'une nouvelle question vient d'être publiée
 * par l'admin pendant que l'utilisateur consultait encore les résultats de la
 * précédente. Bascule automatiquement à la fin du compte à rebours, ou au
 * clic pour les impatients.
 */
export function NewQuestionBanner({ onAccept, autoAcceptSeconds = 8 }: NewQuestionBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(autoAcceptSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      const t = setTimeout(onAccept, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onAccept]);

  const progress = secondsLeft / autoAcceptSeconds;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-black/50 bg-gradient-to-r from-[#00F5D4] to-[#00B8A9] px-3 py-2.5 text-[#04241f]"
      style={{ boxShadow: "0 8px 0 0 rgba(0,0,0,0.55), 0 0 30px rgba(0,245,212,0.55)" }}
      role="status"
    >
      <motion.span
        animate={{ rotate: [0, 18, -18, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="shrink-0"
      >
        <Sparkles className="h-5 w-5" />
      </motion.span>

      <p className="min-w-0 flex-1 font-display text-[15px] leading-tight tracking-wide sm:text-base">
        UNE NOUVELLE QUESTION EST DISPONIBLE
      </p>

      <button
        onClick={onAccept}
        className="relative shrink-0 overflow-hidden rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold tabular-nums transition-colors hover:bg-black/35"
      >
        <span className="relative z-10">Voir · {secondsLeft}s</span>
      </button>

      {/* Barre de progression du compte à rebours */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-black/40"
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ duration: 1, ease: "linear" }}
      />
    </motion.div>
  );
}
