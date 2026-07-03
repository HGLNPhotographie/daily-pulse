"use client";

import { useEffect } from "react";
import { useUserSession } from "@/hooks/useUserSession";

/** Monte la session votant (anonyme Supabase) dès le chargement de l'app. */
export function AuthBootstrap() {
  const { ensureSession } = useUserSession();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  return null;
}
