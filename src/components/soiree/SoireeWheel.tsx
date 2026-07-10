"use client";

import { motion } from "framer-motion";

interface SoireeWheelProps {
  spinning: boolean;
  centered?: boolean;
}

export function SoireeWheel({ spinning, centered }: SoireeWheelProps) {
  if (!spinning) return null;

  const sizeClass = centered ? "h-52 w-52" : "h-40 w-40";

  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      <motion.div
        className="absolute inset-0 rounded-full border-[6px] border-black/10"
        animate={{ rotate: 1080 }}
        transition={{ duration: 2.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 h-1/2 w-0.5 origin-bottom bg-black/15"
            style={{ transform: `translate(-50%, -100%) rotate(${i * 45}deg)` }}
          />
        ))}
        <div className="absolute inset-3 rounded-full bg-gradient-to-b from-white to-black/[0.04]" />
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl text-white shadow-lg"
      >
        ?
      </motion.div>

      <div className="absolute -top-1 left-1/2 z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-black" />
      </div>
    </div>
  );
}
