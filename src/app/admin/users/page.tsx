"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Ban, Search, ShieldCheck, ShieldOff, Trash2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteUserAccount, setUserBanned } from "@/lib/admin-api";
import { getDemoUsers } from "@/lib/demo";
import { useUserSession } from "@/hooks/useUserSession";
import type { UserProfile } from "@/types";

export default function AdminUsersPage() {
  const { user: currentUser } = useUserSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUsers(getDemoUsers());
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase!.from("users").select("*").order("current_streak", { ascending: false });
    setUsers((data as UserProfile[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggleAdmin = async (target: UserProfile) => {
    if (!isSupabaseConfigured) {
      toast.info("Indisponible en mode démo.");
      return;
    }
    if (target.id === currentUser?.id) {
      toast.error("Tu ne peux pas modifier tes propres droits ici.");
      return;
    }
    setBusyId(target.id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase!.from("users").update({ is_admin: !target.is_admin }).eq("id", target.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(target.is_admin ? "Droits admin retirés." : "Promu administrateur.");
    await refresh();
  };

  const toggleBan = async (target: UserProfile) => {
    if (target.is_admin) {
      toast.error("Impossible de bannir un administrateur.");
      return;
    }
    if (target.id === currentUser?.id) {
      toast.error("Tu ne peux pas te bannir toi-même.");
      return;
    }
    const nextBanned = !target.is_banned;
    const msg = nextBanned
      ? `Bannir ${target.pseudo ?? target.email ?? "cet utilisateur"} ? Il ne pourra plus voter.`
      : `Débannir ${target.pseudo ?? target.email ?? "cet utilisateur"} ?`;
    if (!window.confirm(msg)) return;

    setBusyId(target.id);
    const result = await setUserBanned(target.id, nextBanned);
    setBusyId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(nextBanned ? "Utilisateur banni." : "Utilisateur débanni.");
    await refresh();
  };

  const handleDelete = async (target: UserProfile) => {
    if (target.is_admin) {
      toast.error("Impossible de supprimer un administrateur.");
      return;
    }
    if (target.id === currentUser?.id) {
      toast.error("Tu ne peux pas supprimer ton propre compte.");
      return;
    }
    if (
      !window.confirm(
        `Supprimer définitivement ${target.pseudo ?? target.email ?? "cet utilisateur"} ?\nVotes, profil et compte seront effacés. Irréversible.`
      )
    ) {
      return;
    }

    setBusyId(target.id);
    const result = await deleteUserAccount(target.id);
    setBusyId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Compte supprimé.");
    await refresh();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.pseudo?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">UTILISATEURS</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} profil{users.length > 1 ? "s" : ""} · bannir ou supprimer un compte abusif.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un pseudo ou un email..."
          className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none ring-primary/50 focus:ring-2"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((u, i) => {
          const isSelf = u.id === currentUser?.id;
          const busy = busyId === u.id;

          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="neo-border-sm flex flex-col gap-3 rounded-2xl bg-card/70 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <StreakFlame streak={u.current_streak} size="sm" showNumber={false} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{u.pseudo ?? "Anonyme"}</p>
                    {u.is_admin && (
                      <Badge className="gap-1 border-none bg-primary/20 text-primary">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    )}
                    {u.is_banned && (
                      <Badge className="gap-1 border-none bg-destructive/20 text-destructive">
                        <Ban className="h-3 w-3" /> Banni
                      </Badge>
                    )}
                    {isSelf && (
                      <Badge variant="outline" className="text-[10px]">
                        Toi
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <div className="hidden gap-4 text-center text-xs text-muted-foreground sm:flex">
                  <div>
                    <p className="font-display text-lg text-foreground">{u.current_streak}</p>
                    <p>Streak</p>
                  </div>
                  <div>
                    <p className="font-display text-lg text-foreground">{u.highest_streak}</p>
                    <p>Record</p>
                  </div>
                </div>

                {!u.is_admin && !isSelf && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void toggleBan(u)}
                      className="gap-1.5"
                    >
                      {u.is_banned ? <UserX className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      {u.is_banned ? "Débannir" : "Bannir"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleDelete(u)}
                      className="gap-1.5 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </>
                )}

                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => void toggleAdmin(u)}
                    disabled={busy}
                    title={u.is_admin ? "Retirer les droits admin" : "Promouvoir admin"}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-white/5 hover:text-primary"
                  >
                    {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>}
      </div>
    </div>
  );
}
