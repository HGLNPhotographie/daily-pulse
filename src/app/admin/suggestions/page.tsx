"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Radio, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchDemoSuggestions, updateDemoSuggestionStatus } from "@/lib/demo";
import { publishQuestion } from "@/lib/admin-api";
import type { Suggestion, SuggestionStatus } from "@/types";

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSuggestions(await fetchDemoSuggestions());
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase!.from("suggestions").select("*").order("created_at", { ascending: false });
    setSuggestions((data as Suggestion[]) ?? []);
  }, []);

  useEffect(() => {
    // Chargement initial depuis Supabase/localStorage (indisponibles avant le
    // montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const setStatus = async (suggestion: Suggestion, status: SuggestionStatus) => {
    setBusyId(suggestion.id);
    if (!isSupabaseConfigured) {
      setSuggestions(await updateDemoSuggestionStatus(suggestion.id, status));
      setBusyId(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase!.from("suggestions").update({ status }).eq("id", suggestion.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  };

  const publishSuggestion = async (suggestion: Suggestion) => {
    setBusyId(suggestion.id);
    const result = await publishQuestion(suggestion.question_text, "société", 5 * 60);
    if (result.error) {
      toast.error(result.error);
      setBusyId(null);
      return;
    }
    await setStatus(suggestion, "approved");
    toast.success("Suggestion publiée comme Question du Jour !");
  };

  const grouped = {
    pending: suggestions.filter((s) => s.status === "pending"),
    approved: suggestions.filter((s) => s.status === "approved"),
    rejected: suggestions.filter((s) => s.status === "rejected"),
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">SUGGESTIONS</h1>
        <p className="text-sm text-muted-foreground">Modère les idées de questions proposées par la communauté.</p>
      </header>

      <SuggestionGroup
        title={`EN ATTENTE (${grouped.pending.length})`}
        items={grouped.pending}
        busyId={busyId}
        onApprove={(s) => setStatus(s, "approved")}
        onReject={(s) => setStatus(s, "rejected")}
        onPublish={publishSuggestion}
      />
      <SuggestionGroup title={`APPROUVÉES (${grouped.approved.length})`} items={grouped.approved} busyId={busyId} onPublish={publishSuggestion} />
      <SuggestionGroup title={`REJETÉES (${grouped.rejected.length})`} items={grouped.rejected} busyId={busyId} readonly />
    </div>
  );
}

function SuggestionGroup({
  title,
  items,
  busyId,
  onApprove,
  onReject,
  onPublish,
  readonly,
}: {
  title: string;
  items: Suggestion[];
  busyId: string | null;
  onApprove?: (s: Suggestion) => void;
  onReject?: (s: Suggestion) => void;
  onPublish?: (s: Suggestion) => void;
  readonly?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl tracking-wide">{title}</h2>
      <div className="space-y-3">
        {items.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="neo-border-sm flex flex-col gap-3 rounded-2xl bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm">{s.question_text}</p>
            {!readonly && (
              <div className="flex shrink-0 gap-2">
                {onPublish && (
                  <Button size="sm" disabled={busyId === s.id} onClick={() => onPublish(s)} className="gap-1.5">
                    <Radio className="h-3.5 w-3.5" /> Publier
                  </Button>
                )}
                {onApprove && (
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => onApprove(s)} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Approuver
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => onReject(s)} className="gap-1.5 hover:text-destructive">
                    <X className="h-3.5 w-3.5" /> Rejeter
                  </Button>
                )}
              </div>
            )}
            {readonly && <Badge variant="outline">Rejetée</Badge>}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
