"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type AdminSessionStatus =
  | "loading"
  | "demo" // pas de Supabase en dev local : panneau ouvert pour la démo
  | "unconfigured" // prod sans variables Supabase
  | "signed-out"
  | "forbidden"
  | "authorized";

interface UseAdminSessionResult {
  status: AdminSessionStatus;
  user: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Garde d'accès du panneau `/admin` : exige une session Supabase avec `users.is_admin = true`. */
export function useAdminSession(): UseAdminSessionResult {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus(process.env.NODE_ENV === "development" ? "demo" : "unconfigured");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus(process.env.NODE_ENV === "development" ? "demo" : "unconfigured");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setStatus("signed-out");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle();

    setUser(session.user);
    setStatus(profile?.is_admin ? "authorized" : "forbidden");
  }, []);

  useEffect(() => {
    // Vérification de session au montage (Supabase/localStorage indisponibles
    // avant le montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(() => checkSession());
    return () => subscription.subscription.unsubscribe();
  }, [checkSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setStatus("signed-out");
    setUser(null);
  }, []);

  return { status, user, error, signIn, signOut };
}
