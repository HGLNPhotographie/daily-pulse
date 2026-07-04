"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { getOptionLabel, normalizeQuestionOptions } from "@/lib/question-options";
import type { FriendLastVote, FriendListItem, VoteChoice } from "@/types";

interface FriendVoteDialogProps {
  friend: FriendListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadVote: (friendId: string) => Promise<FriendLastVote | { error: string }>;
}

export function FriendVoteDialog({ friend, open, onOpenChange, onLoadVote }: FriendVoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [vote, setVote] = useState<FriendLastVote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !friend) {
      setVote(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void onLoadVote(friend.friend_id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in result) setError(result.error);
      else setVote(result);
    });

    return () => {
      cancelled = true;
    };
  }, [open, friend, onLoadVote]);

  const choiceLabel =
    vote?.choice != null
      ? getOptionLabel(normalizeQuestionOptions(vote.options), vote.choice as VoteChoice)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-black/10 bg-white">
        <DialogHeader>
          <DialogTitle>{friend?.pseudo ?? "Ami"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <StreakFlame streak={friend?.current_streak ?? 0} size="sm" />
            {friend?.current_streak ?? 0} jours de flamme
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-black/45">Chargement...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && vote && (
          <div className="space-y-3 rounded-xl border border-black/8 bg-black/[0.02] p-4 text-sm">
            {vote.hidden ? (
              <div className="flex items-center gap-2 text-black/55">
                <Lock className="h-4 w-4 shrink-0" />
                Cet ami garde ses votes secrets.
              </div>
            ) : vote.question_text ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-black/45">Dernier sondage</p>
                <p className="font-medium leading-snug">{vote.question_text}</p>
                {vote.voted && choiceLabel ? (
                  <p className="text-black/70">
                    A voté : <span className="font-semibold text-black">{choiceLabel}</span>
                  </p>
                ) : (
                  <p className="text-black/55">N&apos;a pas encore voté sur ce sondage.</p>
                )}
              </>
            ) : (
              <p className="text-black/55">Aucun sondage récent.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
