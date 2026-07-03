"use client";

import { useEffect, useRef, useState } from "react";

/** Fait défiler une valeur numérique de sa valeur précédente jusqu'à `value`. */
export function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutExpo(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return display;
}
