"use client";

import { useEffect, useMemo, useState } from "react";

interface UseCountdownResult {
  secondsLeft: number;
  progress: number; // 1 -> 0
  isExpired: boolean;
  isUrgent: boolean;
  formatted: string; // mm:ss
}

/** Compte à rebours haute fréquence (100ms) piloté par une date d'expiration serveur. */
export function useCountdown(expiresAt: string | Date, totalSeconds: number, urgentThreshold = 30): UseCountdownResult {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, target - now);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingMs / (totalSeconds * 1000))) : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return {
    secondsLeft,
    progress,
    isExpired: remainingMs <= 0,
    isUrgent: secondsLeft <= urgentThreshold && remainingMs > 0,
    formatted: `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
  };
}
