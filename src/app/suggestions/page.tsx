"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient, ensureVoterSession, isSupabaseConfigured } from "@/lib/supabase/client";
import { addDemoSuggestion, fetchDemoSuggestions } from "@/lib/demo";
import type { Suggestion } from "@/types";

export default function SuggestionsPage() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient();
      supabase
        ?.from("suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }: { data: Suggestion[] | null }) => data && setSuggestions(data));
      return;
    }
    fetchDemoSuggestions()
      .then(setSuggestions)
      .catch(() => toast.error("Impossible de charger les suggestions."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) {
      toast.error("Ta suggestion doit faire au moins 5 caractères.");
      return;
    }
    setIsSending(true);

    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        toast.error("Client Supabase indisponible.");
        setIsSending(false);
        return;
      }
      try {
        await ensureVoterSession(supabase);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Connexion requise.");
        setIsSending(false);
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        toast.error("Connexion requise pour envoyer une suggestion.");
        setIsSending(false);
        return;
      }
      const { error } = await supabase.from("suggestions").insert({
        question_text: text.trim(),
        user_id: userRes.user.id,
      });
      if (error) toast.error(error.message);
      else toast.success("Suggestion envoyée, merci !");
    } else {
      try {
        const newSuggestion = await addDemoSuggestion(text.trim());
        setSuggestions((prev) => [newSuggestion, ...prev]);
        toast.success("Suggestion enregistrée (mode démo) !");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Envoi impossible.");
        setIsSending(false);
        return;
      }
    }

    setText("");
    setIsSending(false);
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 pt-10">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">PROPOSE UNE QUESTION</h1>
      </div>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Les meilleures suggestions sont sélectionnées par l&apos;équipe et deviennent la Question du Jour !
      </p>

      <form onSubmit={handleSubmit} className="neo-border w-full max-w-md space-y-3 rounded-2xl bg-card/80 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Ex : Les 4 jours de travail devraient-ils être la norme ?"
          className="w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/280</span>
          <Button type="submit" disabled={isSending} className="gap-2">
            <Send className="h-4 w-4" /> Envoyer
          </Button>
        </div>
      </form>

      <div className="w-full max-w-md space-y-3 pb-6">
        {suggestions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="neo-border-sm flex items-start justify-between gap-3 rounded-xl bg-card/70 p-3"
          >
            <p className="text-sm">{s.question_text}</p>
            <StatusBadge status={s.status} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Suggestion["status"] }) {
  const map = {
    pending: { label: "En attente", cls: "bg-amber-500/20 text-amber-300" },
    approved: { label: "Validée", cls: "bg-emerald-500/20 text-emerald-300" },
    rejected: { label: "Refusée", cls: "bg-red-500/20 text-red-300" },
  } as const;
  const cfg = map[status];
  return <Badge className={`shrink-0 border-none ${cfg.cls}`}>{cfg.label}</Badge>;
}
