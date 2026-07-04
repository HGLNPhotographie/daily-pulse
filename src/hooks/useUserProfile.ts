"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useUserSession } from "@/hooks/useUserSession";
import { formatSignupProfileError, normalizePseudo, validatePseudo } from "@/lib/user-profile";
import type { Gender, UserProfile } from "@/types";

const DEMO_STREAK_KEY = "daily-pulse:demo-streak";
const DEMO_BEST_KEY = "daily-pulse:demo-best-streak";

interface UseUserProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (updates: {
    pseudo?: string;
    gender?: Gender | null;
    votes_private?: boolean;
  }) => Promise<{ error: string | null }>;
  /** Streak affichable (Supabase ou démo localStorage). */
  displayStreak: number;
  displayBest: number;
}

export function useUserProfile(): UseUserProfileResult {
  const { user, status } = useUserSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoStreak, setDemoStreak] = useState(0);
  const [demoBest, setDemoBest] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
    if (!error && data) setProfile(data as UserProfile);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const s = Number(typeof window !== "undefined" ? window.localStorage.getItem(DEMO_STREAK_KEY) : null) || 4;
      const b = Math.max(s, Number(typeof window !== "undefined" ? window.localStorage.getItem(DEMO_BEST_KEY) : null) || s);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemoStreak(s);
      setDemoBest(b);
      setIsLoading(false);
      return;
    }
    void refresh();
  }, [refresh, user?.id, user?.is_anonymous, status]);

  const updateProfile = useCallback(
    async (updates: { pseudo?: string; gender?: Gender | null; votes_private?: boolean }) => {
      if (!user || user.is_anonymous) return { error: "Connecte-toi pour modifier ton profil." };
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { error: "Client indisponible." };

      const payload: {
        pseudo?: string;
        gender?: Gender | null;
        profile_completed_at?: string;
        votes_private?: boolean;
      } = {};

      if (updates.pseudo !== undefined) {
        const pseudoError = validatePseudo(updates.pseudo);
        if (pseudoError) return { error: pseudoError };
        payload.pseudo = normalizePseudo(updates.pseudo);
      }
      if (updates.gender !== undefined) {
        payload.gender = updates.gender;
      }
      if (updates.votes_private !== undefined) {
        payload.votes_private = updates.votes_private;
      }
      if (payload.pseudo) {
        payload.profile_completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from("users").update(payload).eq("id", user.id);
      if (error) return { error: formatSignupProfileError(error.message) };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const displayStreak = isSupabaseConfigured && user ? (profile?.current_streak ?? 0) : demoStreak;
  const displayBest = isSupabaseConfigured && user ? (profile?.highest_streak ?? 0) : demoBest;

  return { profile, isLoading, refresh, updateProfile, displayStreak, displayBest };
}

/** Incrémente le streak démo local (mode sans Supabase). */
export function bumpDemoStreakLocal(): number {
  if (typeof window === "undefined") return 0;
  const next = (Number(window.localStorage.getItem(DEMO_STREAK_KEY)) || 0) + 1;
  window.localStorage.setItem(DEMO_STREAK_KEY, String(next));
  const best = Math.max(next, Number(window.localStorage.getItem(DEMO_BEST_KEY)) || 0);
  window.localStorage.setItem(DEMO_BEST_KEY, String(best));
  return next;
}
