"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface NewQuestionBannerProps {
  onAccept: () => void;
  autoAcceptSeconds?: number;
}

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

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-[#0099b8]/30 bg-gradient-to-r from-[#00C8F0] to-[#0088FF] px-4 py-3 shadow-lg shadow-[#0088FF]/25"
      role="status"
    >
      <motion.span
        animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="shrink-0 text-white"
      >
        <Sparkles className="h-5 w-5" />
      </motion.span>

      <p className="min-w-0 flex-1 text-sm font-semibold text-white">Nouvelle question disponible</p>

      <button
        type="button"
        onClick={onAccept}
        className="shrink-0 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0066cc] transition-colors hover:bg-white"
      >
        Voir · {secondsLeft}s
      </button>

      <motion.div
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/40"
        initial={false}
        animate={{ scaleX: secondsLeft / autoAcceptSeconds }}
        transition={{ duration: 1, ease: "linear" }}
      />
    </motion.div>
  );
}
