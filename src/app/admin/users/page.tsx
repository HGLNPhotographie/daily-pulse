"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoUsers } from "@/lib/demo";
import type { UserProfile } from "@/types";

export default function AdminUsersPage() {
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
    // Chargement initial depuis Supabase/localStorage (indisponibles avant le
    // montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggleAdmin = async (user: UserProfile) => {
    if (!isSupabaseConfigured) {
      toast.info("Indisponible en mode démo : branche Supabase pour gérer les droits admin.");
      return;
    }
    setBusyId(user.id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase!.from("users").update({ is_admin: !user.is_admin }).eq("id", user.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
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
        <p className="text-sm text-muted-foreground">{users.length} profil{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}.</p>
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
        {filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="neo-border-sm flex items-center gap-4 rounded-2xl bg-card/70 p-3"
          >
            <StreakFlame streak={u.current_streak} size="sm" showNumber={false} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{u.pseudo ?? "Anonyme"}</p>
                {u.is_admin && (
                  <Badge className="gap-1 border-none bg-primary/20 text-primary">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
            </div>

            <div className="hidden shrink-0 gap-4 text-center text-xs text-muted-foreground sm:flex">
              <div>
                <p className="font-display text-lg text-foreground">{u.current_streak}</p>
                <p>Streak</p>
              </div>
              <div>
                <p className="font-display text-lg text-foreground">{u.highest_streak}</p>
                <p>Record</p>
              </div>
              <div>
                <p className="font-display text-sm text-foreground">
                  {u.last_vote_date ? new Date(u.last_vote_date).toLocaleDateString("fr-FR") : "—"}
                </p>
                <p>Dernier vote</p>
              </div>
            </div>

            <button
              onClick={() => toggleAdmin(u)}
              disabled={busyId === u.id}
              title={u.is_admin ? "Retirer les droits admin" : "Promouvoir admin"}
              className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-white/5 hover:text-primary"
            >
              {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>}
      </div>
    </div>
  );
}
