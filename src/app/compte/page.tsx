"use client";

import { Suspense, useEffect, useState } from "react";
import { Share2, User, UserPlus, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserAuthCard } from "@/components/auth/UserAuthCard";
import { AccountInfoTab } from "@/components/friends/AccountInfoTab";
import { AccountQrCard } from "@/components/friends/AccountQrCard";
import { AddFriendsDialog } from "@/components/friends/AddFriendsDialog";
import { FriendRequestsDialog } from "@/components/friends/FriendRequestsDialog";
import { Button } from "@/components/ui/button";
import { useFriends } from "@/hooks/useFriends";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserSession } from "@/hooks/useUserSession";
import { buildFriendInviteUrl } from "@/lib/friends-api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Gender } from "@/types";
import { cn } from "@/lib/utils";

type AccountTab = "profil" | "infos";

function ComptePageContent() {
  const searchParams = useSearchParams();
  const { status, user, isAnonymous, signOut } = useUserSession();
  const { profile, isLoading, updateProfile, displayStreak } = useUserProfile();
  const friends = useFriends();
  const [tab, setTab] = useState<AccountTab>("profil");
  const [addOpen, setAddOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [handledInvite, setHandledInvite] = useState(false);

  useEffect(() => {
    const friendId = searchParams.get("addFriend");
    if (!friendId || handledInvite || !friends.enabled || !user?.id) return;
    if (friendId === user.id) {
      toast.error("Tu ne peux pas t'ajouter toi-même.");
      setHandledInvite(true);
      return;
    }
    setHandledInvite(true);
    void friends.sendRequestByUserId(friendId).then((result) => {
      if (result.error) toast.error(result.error);
      else toast.success("Demande d'ami envoyée !");
    });
  }, [searchParams, handledInvite, friends, user?.id]);

  const handleShare = async () => {
    if (!user?.id) return;
    const url = buildFriendInviteUrl(user.id);
    const pseudo = profile?.pseudo ?? "moi";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Kitsh — Ajoute-moi",
          text: `Ajoute @${pseudo} sur Kitsh`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papiers.");
      }
    } catch {
      /* annulation share */
    }
  };

  const handleSaveInfo = async (values: { pseudo: string; gender: Gender | ""; votes_private: boolean }) => {
    return updateProfile({
      pseudo: values.pseudo,
      gender: values.gender || null,
      votes_private: values.votes_private,
    });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">Les comptes nécessitent Supabase (voir `.env.local`).</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
      </div>
    );
  }

  const showAuth = isAnonymous || status === "demo";

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-white px-4 pt-8 pb-8">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-black/45" />
        <h1 className="text-sm font-semibold uppercase tracking-[0.25em] text-black/45">Mon compte</h1>
      </div>

      {showAuth ? (
        <>
          <p className="max-w-md text-center text-sm text-black/55">
            Crée un compte pour garder ta flamme ({displayStreak} jour{displayStreak > 1 ? "s" : ""}) et ajouter des
            amis.
          </p>
          <UserAuthCard />
        </>
      ) : (
        <>
          <div className="flex w-full max-w-md rounded-full border border-black/8 bg-black/[0.02] p-1">
            {(
              [
                ["profil", "Mon profil"],
                ["infos", "Mes informations"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-semibold transition-colors",
                  tab === key ? "bg-white text-black shadow-sm" : "text-black/45"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "profil" ? (
            <div className="flex w-full max-w-md flex-col gap-4">
              <AccountQrCard userId={user!.id} pseudo={profile?.pseudo ?? null} streak={displayStreak} />

              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void handleShare()}>
                <Share2 className="h-4 w-4" />
                Partager
              </Button>

              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Ajouter des amis
              </Button>

              <Button type="button" variant="outline" className="relative w-full gap-2" onClick={() => setRequestsOpen(true)}>
                <Users className="h-4 w-4" />
                Demandes d&apos;amis
                {friends.pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4F4F] px-1 text-[10px] font-bold text-white">
                    {friends.pendingCount > 9 ? "9+" : friends.pendingCount}
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <AccountInfoTab
              profile={profile}
              email={user?.email}
              isLoading={isLoading}
              onSave={handleSaveInfo}
              onSignOut={() => void signOut()}
            />
          )}

          <AddFriendsDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            currentUserId={user?.id}
            onSendByUserId={friends.sendRequestByUserId}
            onSendByPseudo={friends.sendRequestByPseudo}
          />

          <FriendRequestsDialog
            open={requestsOpen}
            onOpenChange={setRequestsOpen}
            requests={friends.requests}
            onRespond={friends.respondRequest}
          />
        </>
      )}
    </div>
  );
}

export default function ComptePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
        </div>
      }
    >
      <ComptePageContent />
    </Suspense>
  );
}
