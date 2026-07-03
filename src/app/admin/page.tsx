"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BellRing, MessageSquareText, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionForm, type QuestionFormValues } from "@/components/admin/QuestionForm";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchDemoQuestionHistory, fetchDemoSuggestions, getDemoUsers } from "@/lib/demo";
import { publishQuestion, scheduleQuestion, sendNotificationNow } from "@/lib/admin-api";
import { formatResultsSummary } from "@/lib/question-options";
import { useNowTick } from "@/hooks/useNowTick";
import { computeResults } from "@/types";
import type { Question } from "@/types";

interface Stats {
  totalUsers: number;
  pendingSuggestions: number;
}

export default function AdminDashboardPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingSuggestions: 0 });
  const [isNotifying, setIsNotifying] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const [history, suggestions] = await Promise.all([fetchDemoQuestionHistory(), fetchDemoSuggestions()]);
      const [current] = history;
      setQuestion(current ?? null);
      setStats({
        totalUsers: getDemoUsers().length,
        pendingSuggestions: suggestions.filter((s) => s.status === "pending").length,
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const [{ data: q }, { count: usersCount }, { count: pendingCount }] = await Promise.all([
      supabase.from("questions").select("*").order("active_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setQuestion((q as Question) ?? null);
    setStats({ totalUsers: usersCount ?? 0, pendingSuggestions: pendingCount ?? 0 });
  }, []);

  useEffect(() => {
    // Chargement initial depuis Supabase/localStorage (indisponibles avant le
    // montage) : pattern de synchronisation avec un système externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handlePublish = async (values: QuestionFormValues) => {
    const result = values.scheduledAt
      ? await scheduleQuestion(
          values.text,
          values.category,
          values.scheduledAt,
          values.windowMinutes * 60,
          values.options
        )
      : await publishQuestion(values.text, values.category, values.windowMinutes * 60, values.options);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(values.scheduledAt ? "Question planifiée !" : "Question publiée, le compte à rebours démarre !");
    await refresh();
  };

  const handleNotifyNow = async () => {
    setIsNotifying(true);
    const result = await sendNotificationNow({
      title: "📺 C'est l'heure du Rendez-vous !",
      body: question ? question.text : "La question du jour vient de tomber. Tu as 5 minutes pour voter.",
    });
    setIsNotifying(false);
    if (!result.ok) {
      toast.error(result.error ?? "Échec de l'envoi.");
      return;
    }
    toast.success(`Notification envoyée à ${result.sent} abonné${result.sent > 1 ? "s" : ""} !`);
  };

  const now = useNowTick();
  const results = question ? computeResults(question) : null;
  const isLive = question ? now < new Date(question.expires_at).getTime() : false;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground">Pilote le Rendez-vous Quotidien en direct.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Utilisateurs" value={stats.totalUsers} />
        <StatCard icon={<MessageSquareText className="h-4 w-4" />} label="Suggestions en attente" value={stats.pendingSuggestions} />
        <StatCard icon={<Radio className="h-4 w-4" />} label="Votes sur la question live" value={results?.total ?? 0} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide">QUESTION EN COURS</h2>
          {isLive && (
            <Badge className="gap-1.5 border-none bg-red-600/90 text-white">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> EN DIRECT
            </Badge>
          )}
        </div>

        {question ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="neo-border-sm space-y-3 rounded-2xl bg-card/70 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{question.category}</p>
            <p className="font-display text-xl">{question.text}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Ouverte : {new Date(question.active_at).toLocaleString("fr-FR")}</span>
              <span>Expire : {new Date(question.expires_at).toLocaleString("fr-FR")}</span>
            </div>
            {results && (
              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                <span className="text-muted-foreground">{formatResultsSummary(question)}</span>
                <span className="ml-auto text-muted-foreground">{results.total} votes</span>
              </div>
            )}
            <Button onClick={handleNotifyNow} disabled={isNotifying} className="gap-2">
              <BellRing className="h-4 w-4" />
              {isNotifying ? "Envoi..." : "Envoyer la notification maintenant"}
            </Button>
          </motion.div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune question active pour le moment.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">PUBLIER UNE NOUVELLE QUESTION</h2>
        <QuestionForm onSubmit={handlePublish} />
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="neo-border-sm flex flex-col gap-1 rounded-xl bg-card/70 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="font-display text-3xl text-primary">{value.toLocaleString("fr-FR")}</span>
    </div>
  );
}
