"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ageRangeLabel } from "@/lib/user-profile";
import type { Gender, UserProfile } from "@/types";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre" },
  { value: "prefer_not", label: "Ne souhaite pas répondre" },
];

function formatBirthDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("fr-FR");
}

interface AccountInfoTabProps {
  profile: UserProfile | null;
  email?: string | null;
  isLoading: boolean;
  onSave: (updates: { pseudo: string; gender: Gender | ""; votes_private: boolean }) => Promise<{ error: string | null }>;
  onSignOut: () => void;
}

export function AccountInfoTab({ profile, email, isLoading, onSave, onSignOut }: AccountInfoTabProps) {
  const [pseudo, setPseudo] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [votesPrivate, setVotesPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setPseudo(profile.pseudo ?? "");
      setGender(profile.gender ?? "");
      setVotesPrivate(Boolean(profile.votes_private));
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) {
      toast.error("Choisis un pseudo.");
      return;
    }
    setSaving(true);
    const result = await onSave({ pseudo: pseudo.trim(), gender, votes_private: votesPrivate });
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("Profil enregistré !");
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-black/10 bg-white p-6">
      <div className="space-y-1 text-center">
        <p className="text-xs uppercase tracking-widest text-black/45">Connecté</p>
        <p className="font-semibold">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-black/45">Pseudo (unique)</label>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={24}
          placeholder="Ton pseudo"
          className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />

        <label className="block text-xs font-semibold uppercase tracking-wider text-black/45">Date de naissance</label>
        <p className="rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2.5 text-sm text-black/55">
          {formatBirthDate(profile?.birth_date)}
        </p>

        <label className="block text-xs font-semibold uppercase tracking-wider text-black/45">Tranche d&apos;âge</label>
        <p className="rounded-xl border border-black/8 bg-black/[0.02] px-3 py-2.5 text-sm text-black/55">
          {ageRangeLabel(profile?.age_range)}
        </p>

        <label className="block text-xs font-semibold uppercase tracking-wider text-black/45">Genre (optionnel)</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender | "")}
          className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none"
        >
          <option value="">—</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/8 px-3 py-3">
          <input
            type="checkbox"
            checked={votesPrivate}
            onChange={(e) => setVotesPrivate(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-black/20"
          />
          <span className="text-left text-sm leading-snug">
            <span className="font-medium">Garder mes votes secrets</span>
            <span className="mt-0.5 block text-black/45">Tes amis ne verront pas ce que tu as voté.</span>
          </span>
        </label>

        <Button type="submit" disabled={saving || isLoading} className="w-full">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>

      <Button type="button" variant="outline" onClick={onSignOut} className="w-full">
        Se déconnecter
      </Button>
    </div>
  );
}
