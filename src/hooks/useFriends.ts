"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatFriendError, mapFriendLastVote } from "@/lib/friends-api";
import { useUserSession } from "@/hooks/useUserSession";
import type { FriendLastVote, FriendListItem, FriendRequestItem } from "@/types";

export function useFriends() {
  const { user, isAnonymous } = useUserSession();
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const enabled = isSupabaseConfigured && Boolean(user) && !isAnonymous;

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRequests([]);
      setFriends([]);
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setIsLoading(true);
    try {
      const [reqRes, countRes, friendsRes] = await Promise.all([
        supabase.rpc("list_incoming_friend_requests"),
        supabase.rpc("count_pending_friend_requests"),
        supabase.rpc("list_friends"),
      ]);

      if (!reqRes.error) setRequests((reqRes.data ?? []) as FriendRequestItem[]);
      if (!countRes.error) setPendingCount(Number(countRes.data ?? 0));
      if (!friendsRes.error) setFriends((friendsRes.data ?? []) as FriendListItem[]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendRequestByUserId = useCallback(
    async (userId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { error: "Client indisponible." };
      const { error } = await supabase.rpc("send_friend_request", { p_target_user_id: userId });
      if (error) return { error: formatFriendError(error.message) };
      await refresh();
      return { error: null };
    },
    [refresh]
  );

  const sendRequestByPseudo = useCallback(
    async (pseudo: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { error: "Client indisponible." };
      const { error } = await supabase.rpc("send_friend_request_by_pseudo", { p_pseudo: pseudo.trim() });
      if (error) return { error: formatFriendError(error.message) };
      await refresh();
      return { error: null };
    },
    [refresh]
  );

  const respondRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { error: "Client indisponible." };
      const { error } = await supabase.rpc("respond_friend_request", {
        p_request_id: requestId,
        p_accept: accept,
      });
      if (error) return { error: formatFriendError(error.message) };
      await refresh();
      return { error: null };
    },
    [refresh]
  );

  const getFriendLastVote = useCallback(async (friendId: string): Promise<FriendLastVote | { error: string }> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Client indisponible." };
    const { data, error } = await supabase.rpc("get_friend_last_vote", { p_friend_id: friendId });
    if (error) return { error: formatFriendError(error.message) };
    return mapFriendLastVote(data);
  }, []);

  return {
    enabled,
    requests,
    friends,
    pendingCount,
    isLoading,
    refresh,
    sendRequestByUserId,
    sendRequestByPseudo,
    respondRequest,
    getFriendLastVote,
  };
}
