"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BellRing, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionForm, type QuestionFormValues } from "@/components/admin/QuestionForm";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchDemoQuestionHistory } from "@/lib/demo";
import { publishQuestion, scheduleQuestion, sendNotificationNow } from "@/lib/admin-api";
import { useNowTick } from "@/hooks/useNowTick";
import { computeResults } from "@/types";
import type { Question } from "@/types";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setQuestions(await fetchDemoQuestionHistory());
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase!.from("questions").select("*").order("active_at", { ascending: false }).limit(50);
    setQuestions((data as Question[]) ?? []);
  }, []);

  useEffect(() => {
    // Chargement initial depuis Supabase/localStorage (indisponibles avant le
    // montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handleCreate = async (values: QuestionFormValues) => {
    const result = values.scheduledAt
      ? await scheduleQuestion(values.text, values.category, values.scheduledAt, values.windowMinutes * 60)
      : await publishQuestion(values.text, values.category, values.windowMinutes * 60);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(values.scheduledAt ? "Question planifiée !" : "Question publiée !");
    await refresh();
  };

  const handleNotify = async (question: Question) => {
    setNotifyingId(question.id);
    const result = await sendNotificationNow({ title: "📺 C'est l'heure du Rendez-vous !", body: question.text });
    setNotifyingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Échec de l'envoi.");
      return;
    }
    toast.success(`Notification envoyée à ${result.sent} abonné${result.sent > 1 ? "s" : ""} !`);
  };

  const now = useNowTick();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">QUESTIONS</h1>
        <p className="text-sm text-muted-foreground">Publie, planifie et notifie la Question du Jour.</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">NOUVELLE QUESTION</h2>
        <QuestionForm onSubmit={handleCreate} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">HISTORIQUE</h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const active = q.active_at && new Date(q.active_at).getTime() <= now;
            const expired = q.expires_at && new Date(q.expires_at).getTime() <= now;
            const results = computeResults(q);
            const state: { label: string; cls: string } = !active
              ? { label: "Planifiée", cls: "bg-sky-500/20 text-sky-300" }
              : !expired
                ? { label: "En direct", cls: "bg-red-500/20 text-red-300" }
                : { label: "Terminée", cls: "bg-white/10 text-muted-foreground" };

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="neo-border-sm space-y-2 rounded-2xl bg-card/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{q.category}</p>
                    <p className="font-display text-lg leading-snug">{q.text}</p>
                  </div>
                  <Badge className={`shrink-0 border-none ${state.cls}`}>{state.label}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(q.active_at).toLocaleString("fr-FR")}
                  </span>
                  <span>
                    {results.total} votes · {results.pctPour}% Pour / {results.pctNeutre}% Neutre / {results.pctContre}% Contre
                  </span>
                </div>

                {active && !expired && (
                  <Button size="sm" variant="outline" disabled={notifyingId === q.id} onClick={() => handleNotify(q)} className="gap-2">
                    <BellRing className="h-3.5 w-3.5" />
                    {notifyingId === q.id ? "Envoi..." : "Notifier maintenant"}
                  </Button>
                )}
              </motion.div>
            );
          })}
          {questions.length === 0 && <p className="text-sm text-muted-foreground">Aucune question pour le moment.</p>}
        </div>
      </section>
    </div>
  );
}
