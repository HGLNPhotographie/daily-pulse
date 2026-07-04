"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CurtainRevealProps {
  /** Quand `true`, les panneaux blancs s'écartent pour révéler le contenu sur fond noir. */
  open: boolean;
  children?: React.ReactNode;
  /** Texte affiché sur le panneau fermé (ex: "Kitsh"). */
  label?: string;
  /** Affiche « … » animé sous le label (écran d'attente sans question). */
  showWaitingDots?: boolean;
  onRevealComplete?: () => void;
  className?: string;
}

const PANEL_EASE = [0.65, 0, 0.15, 1] as const;

/**
 * Révélation minimaliste : deux panneaux blancs recouvrent l'écran puis
 * s'écartent (haut / bas) pour dévoiler la question sur fond noir.
 */
export function CurtainReveal({
  open,
  children,
  label = "Kitsh",
  showWaitingDots = false,
  onRevealComplete,
  className,
}: CurtainRevealProps) {
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => onRevealComplete?.(), 550);
    return () => clearTimeout(timeout);
  }, [open, onRevealComplete]);

  const isClosing = prevOpenRef.current && !open;
  useEffect(() => {
    prevOpenRef.current = open;
  }, [open]);

  return (
    <div
      className={cn(
        "relative isolate w-full max-w-lg",
        !open && "min-h-[min(72vh,calc(100dvh-11rem))]",
        className
      )}
    >
      {/* Scène noire — question & sondage ; en mode ouvert, la hauteur suit le contenu */}
      <div className={cn("w-full bg-black", open ? "relative" : "absolute inset-0")}>
        <div
          className={cn(
            "relative flex w-full flex-col items-center px-5 py-8 pb-12",
            open && "min-h-[min(55vh,calc(100dvh-13rem))] justify-center",
            open ? "opacity-100 transition-opacity duration-300 delay-[480ms]" : "opacity-0"
          )}
        >
          {children}
        </div>
      </div>

      <AnimatePresence>
        {!open && (
          <>
            <WhitePanel side="top" label={showWaitingDots ? undefined : label} closing={isClosing} />
            <WhitePanel side="bottom" closing={isClosing} />
            {showWaitingDots && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-black/80">{label}</p>
                  <AnimatedEllipsis />
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhitePanel({
  side,
  label,
  closing,
}: {
  side: "top" | "bottom";
  label?: string;
  closing: boolean;
}) {
  const isTop = side === "top";

  return (
    <motion.div
      initial={closing ? { y: isTop ? "-100%" : "100%" } : { y: 0 }}
      animate={{ y: 0 }}
      exit={{
        y: isTop ? "-100%" : "100%",
        transition: { duration: 0.85, ease: PANEL_EASE, delay: isTop ? 0 : 0.04 },
      }}
      transition={closing ? { duration: 0.85, ease: PANEL_EASE, delay: isTop ? 0 : 0.04 } : { duration: 0 }}
      className={cn(
        "absolute inset-x-0 z-20 flex h-1/2 bg-white",
        isTop ? "top-0 items-end justify-center pb-6" : "bottom-0 items-start justify-center pt-6"
      )}
    >
      {isTop && label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-sm font-semibold uppercase tracking-[0.35em] text-black/80"
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  );
}

function AnimatedEllipsis() {
  return (
    <span className="text-lg font-medium leading-none text-black/55" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
