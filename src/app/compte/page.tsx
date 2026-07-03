"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { UserAuthCard } from "@/components/auth/UserAuthCard";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserSession } from "@/hooks/useUserSession";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AgeRange, Gender } from "@/types";

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "18-24", label: "18–24 ans" },
  { value: "25-34", label: "25–34 ans" },
  { value: "35-44", label: "35–44 ans" },
  { value: "45-54", label: "45–54 ans" },
  { value: "55+", label: "55 ans et +" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre" },
  { value: "prefer_not", label: "Ne souhaite pas répondre" },
];

export default function ComptePage() {
  const { status, user, isAnonymous, signOut } = useUserSession();
  const { profile, isLoading, updateProfile, displayStreak } = useUserProfile();
  const [pseudo, setPseudo] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPseudo(profile.pseudo ?? "");
      setAgeRange(profile.age_range ?? "");
      setGender(profile.gender ?? "");
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) {
      toast.error("Choisis un pseudo.");
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      pseudo: pseudo.trim(),
      age_range: ageRange || null,
      gender: gender || null,
    });
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("Profil enregistré !");
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
      <div className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const showAuth = isAnonymous || status === "demo";

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 pt-10 pb-8">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">MON COMPTE</h1>
      </div>

      {showAuth ? (
        <>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Crée un compte pour garder ta flamme ({displayStreak} jour{displayStreak > 1 ? "s" : ""} en cours) et
            participer aux stats.
          </p>
          <UserAuthCard />
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-border w-full max-w-md space-y-4 rounded-2xl bg-card/90 p-6"
        >
          <div className="space-y-1 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Connecté</p>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-sm text-primary">Flamme : {displayStreak} jour{displayStreak > 1 ? "s" : ""}</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pseudo (affiché au classement)
            </label>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={24}
              placeholder="Ton pseudo TV"
              className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
            />

            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tranche d&apos;âge (optionnel)
            </label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value as AgeRange | "")}
              className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none"
            >
              <option value="">—</option>
              {AGE_RANGES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Genre (optionnel)
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
              className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none"
            >
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            <Button type="submit" disabled={saving || isLoading} className="w-full">
              {saving ? "Enregistrement..." : "Enregistrer mon profil"}
            </Button>
          </form>

          <Button type="button" variant="outline" onClick={() => void signOut()} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </motion.div>
      )}
    </div>
  );
}
