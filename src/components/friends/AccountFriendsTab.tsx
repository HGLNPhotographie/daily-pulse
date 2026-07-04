"use client";

import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendsLeaderboard } from "@/components/friends/FriendsLeaderboard";
import type { FriendLastVote, FriendListItem } from "@/types";

interface AccountFriendsTabProps {
  friends: FriendListItem[];
  isLoading: boolean;
  pendingCount: number;
  onAddClick: () => void;
  onRequestsClick: () => void;
  onLoadVote: (friendId: string) => Promise<FriendLastVote | { error: string }>;
  onRemoveFriend: (friendId: string) => Promise<{ error: string | null }>;
  onBlockFriend: (friendId: string) => Promise<{ error: string | null }>;
}

export function AccountFriendsTab({
  friends,
  isLoading,
  pendingCount,
  onAddClick,
  onRequestsClick,
  onLoadVote,
  onRemoveFriend,
  onBlockFriend,
}: AccountFriendsTabProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 gap-2" onClick={onAddClick}>
          <UserPlus className="h-4 w-4" />
          Ajouter
        </Button>
        <Button type="button" variant="outline" className="relative flex-1 gap-2" onClick={onRequestsClick}>
          <Users className="h-4 w-4" />
          Demandes
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4F4F] px-1 text-[10px] font-bold text-white">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </Button>
      </div>

      <FriendsLeaderboard
        friends={friends}
        isLoading={isLoading}
        onLoadVote={onLoadVote}
        onRemoveFriend={onRemoveFriend}
        onBlockFriend={onBlockFriend}
        emptyMessage="Pas encore d'amis. Ajoute-en via QR code ou pseudo."
        showRank
      />
    </div>
  );
}
