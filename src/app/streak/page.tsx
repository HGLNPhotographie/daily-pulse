"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { StreakFlame } from "@/components/flame/StreakFlame";
import { STREAK_TIERS } from "@/lib/constants";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserSession } from "@/hooks/useUserSession";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function StreakPage() {
  const { isAnonymous } = useUserSession();
  const { displayStreak, displayBest, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 pt-10">
      <h1 className="font-display text-3xl tracking-wide text-glow-pink">MA FLAMME</h1>

      {isSupabaseConfigured && isAnonymous && (
        <div className="neo-border-sm max-w-md rounded-xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
          <p>Tu joues en mode invité. Crée un compte pour sauvegarder ta flamme.</p>
          <Link
            href="/compte"
            className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Créer mon compte
          </Link>
        </div>
      )}

      <StreakFlame streak={displayStreak} size="xl" />

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <StatCard label="Streak actuel" value={displayStreak} accent="#00F5D4" />
        <StatCard label="Record perso" value={displayBest} accent="#FACC15" icon={<Trophy className="h-4 w-4" />} />
      </div>

      <div className="w-full max-w-md space-y-3">
        <h2 className="font-display text-xl tracking-wide">PALIERS</h2>
        {STREAK_TIERS.slice()
          .reverse()
          .map((tier) => {
            const reached = displayStreak >= tier.min;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "neo-border-sm flex items-center justify-between rounded-xl bg-card/70 px-4 py-3",
                  !reached && "opacity-40 grayscale"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: tier.colors[0], boxShadow: `0 0 10px ${tier.colors[0]}` }}
                  />
                  <span className="font-semibold">{tier.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{tier.min}+ jours</span>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="neo-border-sm flex flex-col items-center gap-1 rounded-xl bg-card/70 px-4 py-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="font-display text-4xl" style={{ color: accent, textShadow: `0 0 14px ${accent}88` }}>
        {value}
      </span>
    </div>
  );
}
