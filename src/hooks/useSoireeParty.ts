"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SoireeParty, SoireePlayer, SoireeQuestion } from "@/types/soiree";

export function useSoireeParty(partyId: string | null) {
  const [party, setParty] = useState<SoireeParty | null>(null);
  const [players, setPlayers] = useState<SoireePlayer[]>([]);
  const [question, setQuestion] = useState<SoireeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!partyId || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const [{ data: partyData }, { data: playersData }] = await Promise.all([
      supabase.from("soiree_parties").select("*").eq("id", partyId).maybeSingle(),
      supabase.from("soiree_players_public").select("*").eq("party_id", partyId).order("joined_at"),
    ]);

    setParty((partyData as SoireeParty) ?? null);
    setPlayers((playersData as SoireePlayer[]) ?? []);

    const qId = (partyData as SoireeParty | null)?.current_question_id;
    if (qId) {
      const { data: q } = await supabase
        .from("soiree_questions_public")
        .select("*")
        .eq("id", qId)
        .maybeSingle();
      setQuestion((q as SoireeQuestion) ?? null);
    } else {
      setQuestion(null);
    }
    setIsLoading(false);
  }, [partyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!partyId || !isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`soiree-${partyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "soiree_parties", filter: `id=eq.${partyId}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "soiree_players", filter: `party_id=eq.${partyId}` },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [partyId, refresh]);

  return { party, players, question, isLoading, refresh };
}
