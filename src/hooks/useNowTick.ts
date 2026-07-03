"use client";

import { useEffect, useState } from "react";

/**
 * Horloge partagée pour dériver des états temporels (question live / expirée)
 * pendant le rendu sans jamais appeler `Date.now()` directement (impur).
 */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
