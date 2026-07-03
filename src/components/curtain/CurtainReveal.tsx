"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CurtainRevealProps {
  /** Quand `true`, le rideau s'ouvre (théâtral) pour révéler `children`. */
  open: boolean;
  children: React.ReactNode;
  /** Texte affiché sur le rideau fermé, avant l'ouverture (ex: "ON AIR DANS..."). */
  label?: string;
  onRevealComplete?: () => void;
  className?: string;
}

const RIDGE_COUNT = 14;

/**
 * Rideau de théâtre / plateau télé : deux panneaux (haut / bas) recouvrent
 * l'écran puis s'écartent verticalement dans un mouvement élastique pour
 * dévoiler la question du jour, à la manière d'un jeu télévisé américain.
 */
export function CurtainReveal({ open, children, label = "LE RENDEZ-VOUS", onRevealComplete, className }: CurtainRevealProps) {
  // Purement dérivé de `open` (pas de state local) : le fondu d'entrée du
  // contenu est retardé en CSS le temps que les panneaux s'écartent, sans
  // jamais désynchroniser l'affichage serveur/client au montage.
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => onRevealComplete?.(), 550);
    return () => clearTimeout(timeout);
  }, [open, onRevealComplete]);

  return (
    <div className={cn("relative isolate flex min-h-[70vh] w-full items-center justify-center overflow-hidden", className)}>
      {/* Halo de projecteur, toujours présent derrière le rideau */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, oklch(0.75 0.22 340 / 25%), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 90%, oklch(0.83 0.19 175 / 20%), transparent 60%)",
        }}
      />

      {/* Contenu révélé */}
      <div
        className={cn(
          "relative z-0 w-full",
          open ? "opacity-100 transition-opacity duration-300 delay-[550ms]" : "opacity-0"
        )}
      >
        {children}
      </div>

      <AnimatePresence>
        {!open && (
          <>
            <CurtainPanel side="top" label={label} />
            <CurtainPanel side="bottom" label={label} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CurtainPanel({ side, label }: { side: "top" | "bottom"; label: string }) {
  const isTop = side === "top";

  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{
        y: isTop ? "-105%" : "105%",
        transition: { duration: 0.9, ease: [0.7, 0, 0.15, 1], delay: isTop ? 0 : 0.06 },
      }}
      className={cn(
        "absolute inset-x-0 z-20 flex h-1/2 overflow-hidden",
        isTop ? "top-0 items-end" : "bottom-0 items-start"
      )}
    >
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{
          background:
            "repeating-linear-gradient(90deg, #7a0f2b 0px, #7a0f2b 26px, #5c0a20 26px, #5c0a20 52px)",
          boxShadow: isTop ? "inset 0 -40px 60px -20px rgba(0,0,0,0.6)" : "inset 0 40px 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        {/* Voile de dégradé sombre pour donner du velours au rideau */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: isTop
              ? "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 60%)"
              : "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)",
          }}
        />

        {/* Plis du rideau */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: RIDGE_COUNT }).map((_, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{
                background: `linear-gradient(90deg, rgba(0,0,0,${i % 2 === 0 ? 0.28 : 0}), rgba(255,255,255,0.05))`,
              }}
            />
          ))}
        </div>

        {/* Rangée d'ampoules façon marquee, sur le bord de la scène */}
        <div className={cn("absolute inset-x-0 flex justify-center gap-3 px-6", isTop ? "bottom-2" : "top-2")}>
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_3px_rgba(252,211,77,0.85)]"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.09, ease: "easeInOut" }}
            />
          ))}
        </div>

        {isTop && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-display text-3xl tracking-[0.3em] text-amber-200 text-glow-pink sm:text-5xl"
          >
            {label}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
