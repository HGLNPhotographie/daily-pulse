"use client";

import { useState } from "react";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { FriendVoteDialog } from "@/components/friends/FriendVoteDialog";
import type { FriendLastVote, FriendListItem } from "@/types";
import { cn } from "@/lib/utils";

interface FriendsLeaderboardProps {
  friends: FriendListItem[];
  isLoading: boolean;
  onLoadVote: (friendId: string) => Promise<FriendLastVote | { error: string }>;
  onRemoveFriend: (friendId: string) => Promise<{ error: string | null }>;
  onBlockFriend: (friendId: string) => Promise<{ error: string | null }>;
  emptyMessage?: string;
  showRank?: boolean;
}

export function FriendsLeaderboard({
  friends,
  isLoading,
  onLoadVote,
  onRemoveFriend,
  onBlockFriend,
  emptyMessage = "Pas encore d'amis. Partage ton QR code depuis Mon compte.",
  showRank = true,
}: FriendsLeaderboardProps) {
  const [selected, setSelected] = useState<FriendListItem | null>(null);

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-xl bg-black/5" />;
  }

  if (friends.length === 0) {
    return (
      <p className="rounded-xl border border-black/8 px-4 py-6 text-center text-sm text-black/45">{emptyMessage}</p>
    );
  }

  return (
    <>
      <div className="w-full space-y-2">
        {friends.map((friend, index) => (
          <button
            key={friend.friend_id}
            type="button"
            onClick={() => setSelected(friend)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-black/8 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
            )}
          >
            <div className="flex items-center gap-3">
              {showRank && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
              )}
              <div>
                <p className="font-medium">{friend.pseudo}</p>
                <p className="text-xs text-black/45">Record {friend.highest_streak} j</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StreakFlame streak={friend.current_streak} size="sm" />
              <span className="text-sm font-semibold tabular-nums">{friend.current_streak}</span>
            </div>
          </button>
        ))}
      </div>

      <FriendVoteDialog
        friend={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        onLoadVote={onLoadVote}
        onRemoveFriend={onRemoveFriend}
        onBlockFriend={onBlockFriend}
      />
    </>
  );
}
