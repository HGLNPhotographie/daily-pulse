"use client";

import { useCallback, useEffect, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  signInWithEmail,
  signInWithOAuthProvider,
  signOutUser,
  signUpWithEmail,
} from "@/lib/auth/client-auth";
import { getSupabaseBrowserClient, ensureVoterSession, isSupabaseConfigured } from "@/lib/supabase/client";
import { signOutIfBanned } from "@/lib/user-ban";

export type UserSessionStatus = "loading" | "demo" | "anonymous" | "signed-in";

interface UseUserSessionResult {
  status: UserSessionStatus;
  user: User | null;
  isAnonymous: boolean;
  ensureSession: () => Promise<User | null>;
  signUpEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInOAuth: (provider: Provider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useUserSession(): UseUserSessionResult {
  const [status, setStatus] = useState<UserSessionStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const syncFromSession = useCallback((session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setStatus("loading");
      return;
    }
    setUser(session.user);
    setStatus(session.user.is_anonymous ? "anonymous" : "signed-in");
  }, []);

  const ensureSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus("demo");
      return null;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;
    try {
      const session = await ensureVoterSession(supabase);
      if (session?.user) {
        const banned = await signOutIfBanned(supabase, session.user.id);
        if (banned) {
          setUser(null);
          setStatus("loading");
          return null;
        }
      }
      syncFromSession(session);
      return session?.user ?? null;
    } catch {
      setStatus("demo");
      return null;
    }
  }, [syncFromSession]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void ensureSession();
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
      syncFromSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [ensureSession, syncFromSession]);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Client indisponible." };
    const { error } = await signUpWithEmail(supabase, email, password, Boolean(user?.is_anonymous));
    if (error) return { error: error.message };
    const { data: { session } } = await supabase.auth.getSession();
    syncFromSession(session);
    return { error: null };
  }, [user?.is_anonymous, syncFromSession]);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Client indisponible." };
    const { error } = await signInWithEmail(supabase, email, password);
    if (error) return { error: error.message };
    const { data: { session } } = await supabase.auth.getSession();
    syncFromSession(session);
    return { error: null };
  }, [syncFromSession]);

  const signInOAuth = useCallback(async (provider: Provider) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Client indisponible." };
    const { error } = await signInWithOAuthProvider(supabase, provider, {
      linkAnonymous: Boolean(user?.is_anonymous),
    });
    if (error) return { error: error.message };
    return { error: null };
  }, [user?.is_anonymous]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await signOutUser(supabase);
    setUser(null);
    setStatus("loading");
    await ensureVoterSession(supabase).catch(() => null);
    const { data: { session } } = await supabase.auth.getSession();
    syncFromSession(session);
  }, [syncFromSession]);

  return {
    status,
    user,
    isAnonymous: Boolean(user?.is_anonymous),
    ensureSession,
    signUpEmail,
    signInEmail,
    signInOAuth,
    signOut,
  };
}
