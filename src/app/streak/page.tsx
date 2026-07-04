"use client";

import Link from "next/link";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { FriendsLeaderboard } from "@/components/friends/FriendsLeaderboard";
import { STREAK_TIERS } from "@/lib/constants";
import { useFriends } from "@/hooks/useFriends";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserSession } from "@/hooks/useUserSession";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function StreakPage() {
  const { isAnonymous } = useUserSession();
  const { displayStreak, displayBest, isLoading } = useUserProfile();
  const { friends, isLoading: friendsLoading, getFriendLastVote, removeFriend, blockFriend, enabled: friendsEnabled } = useFriends();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-10 bg-white px-4 pt-10 pb-8">
      <h1 className="text-sm font-semibold uppercase tracking-[0.25em] text-black/45">Ma flamme</h1>

      {isSupabaseConfigured && isAnonymous && (
        <div className="max-w-md rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3 text-center text-sm text-black/60">
          <p>Mode invité — crée un compte pour sauvegarder ta flamme.</p>
          <Link href="/compte" className="mt-2 inline-block text-sm font-medium text-black underline-offset-2 hover:underline">
            Créer mon compte
          </Link>
        </div>
      )}

      <StreakFlame streak={displayStreak} size="xl" />

      <div className="grid w-full max-w-sm grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/8 bg-black/8">
        <StatCard label="Actuel" value={displayStreak} />
        <StatCard label="Record" value={displayBest} />
      </div>

      <div className="w-full max-w-sm space-y-2">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Paliers</h2>
        {STREAK_TIERS.slice()
          .reverse()
          .map((tier) => {
            const reached = displayStreak >= tier.min;
            return (
              <div
                key={tier.name}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-black/6 px-4 py-3",
                  !reached && "opacity-35"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: tier.colors[0] }} />
                  <span className="text-sm font-medium">{tier.name}</span>
                </div>
                <span className="text-xs text-black/45">{tier.min}+ jours</span>
              </div>
            );
          })}
      </div>

      {friendsEnabled && (
        <div className="w-full max-w-sm space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Mes amis</h2>
          <FriendsLeaderboard
            friends={friends}
            isLoading={friendsLoading}
            onLoadVote={getFriendLastVote}
            onRemoveFriend={removeFriend}
            onBlockFriend={blockFriend}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white px-4 py-5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-black/45">{label}</span>
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}
