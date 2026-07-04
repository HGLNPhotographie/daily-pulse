"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-black/10 bg-white px-4 py-3 shadow-sm"
      role="status"
    >
      <p className="min-w-0 flex-1 text-sm font-medium text-black">Nouvelle question disponible</p>
      <button
        onClick={onAccept}
        className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
      >
        Voir · {secondsLeft}s
      </button>
    </motion.div>
  );
}
