"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BellRing, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PollResultsSummary } from "@/components/admin/PollResultsSummary";
import { QuestionForm, type QuestionFormValues } from "@/components/admin/QuestionForm";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchDemoQuestionHistory, getDemoUsers } from "@/lib/demo";
import { publishQuestion, scheduleQuestion, sendNotificationNow } from "@/lib/admin-api";
import {
  findLastEndedQuestion,
  findLiveQuestion,
  getQuestionAdminState,
} from "@/lib/question-active";
import { useNowTick } from "@/hooks/useNowTick";
import { computeResults } from "@/types";
import type { Question } from "@/types";

interface Stats {
  totalUsers: number;
}

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0 });
  const [isNotifying, setIsNotifying] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const history = await fetchDemoQuestionHistory();
      setQuestions(history);
      setStats({ totalUsers: getDemoUsers().length });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const [{ data }, { count: usersCount }] = await Promise.all([
      supabase.from("questions").select("*").order("active_at", { ascending: false }).limit(30),
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]);

    setQuestions((data as Question[]) ?? []);
    setStats({ totalUsers: usersCount ?? 0 });
  }, []);

  useEffect(() => {
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

  const handleNotifyNow = async (question: Question) => {
    setIsNotifying(true);
    const result = await sendNotificationNow({
      title: "📺 C'est l'heure du Rendez-vous !",
      body: question.text,
    });
    setIsNotifying(false);
    if (!result.ok) {
      toast.error(result.error ?? "Échec de l'envoi.");
      return;
    }
    toast.success(`Notification envoyée à ${result.sent} abonné${result.sent > 1 ? "s" : ""} !`);
  };

  const now = useNowTick();
  const liveQuestion = findLiveQuestion(questions, now);
  const lastEndedQuestion = findLastEndedQuestion(questions, now);
  const summaryQuestion = liveQuestion ?? lastEndedQuestion;
  const summaryResults = summaryQuestion ? computeResults(summaryQuestion) : null;
  const upcomingCount = questions.filter((q) => getQuestionAdminState(q, now) === "scheduled").length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-glow-cyan">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground">Pilote le Rendez-vous Quotidien en direct.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard icon={<Users className="h-4 w-4" />} label="Utilisateurs" value={stats.totalUsers} />
        <StatCard
          icon={<Radio className="h-4 w-4" />}
          label={liveQuestion ? "Votes en direct" : "Dernier sondage"}
          value={summaryResults?.total ?? 0}
        />
      </div>

      {liveQuestion && (
        <QuestionSection
          title="EN DIRECT"
          badge={
            <Badge className="gap-1.5 border-none bg-red-600/90 text-white">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> EN DIRECT
            </Badge>
          }
          question={liveQuestion}
          resultsTitle="RÉSULTATS EN DIRECT"
          notify={{
            loading: isNotifying,
            onClick: () => void handleNotifyNow(liveQuestion),
          }}
        />
      )}

      {lastEndedQuestion && (!liveQuestion || lastEndedQuestion.id !== liveQuestion.id) && (
        <QuestionSection
          title="DERNIER SONDAGE TERMINÉ"
          badge={
            <Badge className="shrink-0 border-none bg-white/10 text-muted-foreground">Terminé</Badge>
          }
          question={lastEndedQuestion}
          resultsTitle="RÉSUMÉ DU SONDAGE"
        />
      )}

      {!liveQuestion && !lastEndedQuestion && (
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-wide">SONDAGE</h2>
          <p className="text-sm text-muted-foreground">Aucun sondage pour le moment.</p>
        </section>
      )}

      {upcomingCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {upcomingCount} question{upcomingCount > 1 ? "s" : ""} planifiée{upcomingCount > 1 ? "s" : ""} — voir l&apos;onglet Questions.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">PUBLIER UNE NOUVELLE QUESTION</h2>
        <QuestionForm onSubmit={handlePublish} />
      </section>
    </div>
  );
}

function QuestionSection({
  title,
  badge,
  question,
  resultsTitle,
  notify,
}: {
  title: string;
  badge: React.ReactNode;
  question: Question;
  resultsTitle: string;
  notify?: { loading: boolean; onClick: () => void };
}) {
  const results = computeResults(question);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl tracking-wide">{title}</h2>
        {badge}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="neo-border-sm space-y-4 rounded-2xl bg-card/70 p-4"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{question.category}</p>
          <p className="font-display text-xl">{question.text}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Ouverte : {new Date(question.active_at).toLocaleString("fr-FR")}</span>
            <span>Clôturée : {new Date(question.expires_at).toLocaleString("fr-FR")}</span>
            <span>{results.total} vote{results.total > 1 ? "s" : ""}</span>
          </div>
        </div>

        <PollResultsSummary question={question} title={resultsTitle} />

        {notify && (
          <Button onClick={notify.onClick} disabled={notify.loading} className="gap-2">
            <BellRing className="h-4 w-4" />
            {notify.loading ? "Envoi..." : "Envoyer la notification maintenant"}
          </Button>
        )}
      </motion.div>
    </section>
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
