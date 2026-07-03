"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, ensureVoterSession, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  castDemoVote,
  clearDemoVoteForQuestion,
  fetchDemoQuestion,
  getDemoVote,
  subscribeDemoLiveActivity,
} from "@/lib/demo";
import type { PollPhase, Question, VoteChoice } from "@/types";

function formatVoteError(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    if (err.message?.includes("AUTH_REQUIRED")) {
      return "Tu n'es pas connecté. Rafraîchis la page, ou active « Anonymous Sign-Ins » dans Supabase (Authentication → Providers).";
    }
    const parts = [err.message, err.details, err.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(" — ");
  }
  return "Une erreur est survenue pendant le vote.";
}

function incrementQuestionTotals(q: Question, choice: VoteChoice): Question {
  const key = choice === "pour" ? "total_pour" : choice === "contre" ? "total_contre" : "total_neutre";
  return { ...q, [key]: q[key] + 1 };
}

export interface UseDailyQuestionResult {
  question: Question | null;
  phase: PollPhase;
  myVote: VoteChoice | null;
  curtainOpen: boolean;
  openCurtain: () => void;
  submitVote: (choice: VoteChoice) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  streakDelta: 0 | 1;
  incomingQuestion: Question | null;
  acceptIncomingQuestion: () => void;
}

const DailyQuestionContext = createContext<UseDailyQuestionResult | null>(null);

function useDailyQuestionState(): UseDailyQuestionResult {
  const [question, setQuestion] = useState<Question | null>(null);
  const [myVote, setMyVote] = useState<VoteChoice | null>(null);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streakDelta, setStreakDelta] = useState<0 | 1>(0);
  const [incomingQuestion, setIncomingQuestion] = useState<Question | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mountedRef = useRef(true);
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentQuestionIdRef.current = question?.id ?? null;
  }, [question]);

  const applyIncoming = useCallback((updated: Question) => {
    if (!mountedRef.current) return;
    if (!currentQuestionIdRef.current || currentQuestionIdRef.current === updated.id) {
      setQuestion(updated);
    } else {
      setIncomingQuestion(updated);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;

    let cancelled = false;

    (async () => {
      try {
        const q = await fetchDemoQuestion();
        if (cancelled || !mountedRef.current) return;
        clearDemoVoteForQuestion(q.id);
        setQuestion(q);
        const existing = getDemoVote();
        if (existing) {
          setMyVote(existing.choice);
          setStreakDelta(existing.isInTime ? 1 : 0);
          setCurtainOpen(true);
        }
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Impossible de charger la question démo.");
        }
      }
    })();

    const unsubscribe = subscribeDemoLiveActivity((updated) => {
      const prevId = currentQuestionIdRef.current;
      if (prevId && prevId !== updated.id) {
        setMyVote(null);
        setStreakDelta(0);
        setCurtainOpen(false);
      }
      clearDemoVoteForQuestion(updated.id);
      applyIncoming(updated);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyIncoming]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;
    let questionChannel: ReturnType<typeof supabase.channel> | null = null;

    const newQuestionChannel = supabase
      .channel("questions-new")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" }, (payload: RealtimePostgresChangesPayload<Question>) => {
        const inserted = payload.new as Question;
        if (new Date(inserted.active_at).getTime() <= Date.now()) applyIncoming(inserted);
      })
      .subscribe();

    void (async () => {
      await ensureVoterSession(supabase).catch((e) => {
        if (!cancelled && mountedRef.current) setError(formatVoteError(e));
      });
      if (cancelled) return;

      const { data, error: qError } = await supabase
        .from("questions")
        .select("*")
        .lte("active_at", new Date().toISOString())
        .order("active_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (qError) setError(qError.message);
      if (data && mountedRef.current) setQuestion(data as Question);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid && data) {
        const { data: existingVote } = await supabase
          .from("votes")
          .select("choice, is_in_time")
          .eq("question_id", data.id)
          .eq("user_id", uid)
          .maybeSingle();
        if (!cancelled && existingVote && mountedRef.current) {
          setMyVote(existingVote.choice as VoteChoice);
          setStreakDelta(existingVote.is_in_time ? 1 : 0);
          setCurtainOpen(true);
        }
      }

      if (cancelled || !data) return;

      questionChannel = supabase
        .channel(`question-${data.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "questions", filter: `id=eq.${data.id}` },
          (payload: RealtimePostgresChangesPayload<Question>) => applyIncoming(payload.new as Question)
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (questionChannel) supabase.removeChannel(questionChannel);
      supabase.removeChannel(newQuestionChannel);
    };
  }, [applyIncoming]);

  const openCurtain = useCallback(() => setCurtainOpen(true), []);

  const acceptIncomingQuestion = useCallback(() => {
    if (!incomingQuestion) return;
    setQuestion(incomingQuestion);
    setMyVote(null);
    setStreakDelta(0);
    setCurtainOpen(false);
    setIncomingQuestion(null);
  }, [incomingQuestion]);

  const submitVote = useCallback(
    async (choice: VoteChoice): Promise<boolean> => {
      if (!question || isSubmitting) return false;
      setIsSubmitting(true);
      setError(null);
      try {
        if (!isSupabaseConfigured) {
          const { isInTime, question: updated } = await castDemoVote(choice);
          setQuestion(updated);
          setMyVote(choice);
          setStreakDelta(isInTime ? 1 : 0);
          return isInTime;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Client Supabase indisponible");

        await ensureVoterSession(supabase);

        const { data, error: rpcError } = await supabase.rpc("cast_vote", {
          p_question_id: question.id,
          p_choice: choice,
        });
        if (rpcError) throw rpcError;
        const voteRow = data as { is_in_time?: boolean } | null;
        const isInTime = Boolean(voteRow?.is_in_time);

        setQuestion((q) => (q ? incrementQuestionTotals(q, choice) : q));
        setMyVote(choice);
        setStreakDelta(isInTime ? 1 : 0);

        const { data: refreshed } = await supabase
          .from("questions")
          .select("*")
          .eq("id", question.id)
          .maybeSingle();
        if (refreshed && mountedRef.current) {
          setQuestion(refreshed as Question);
        }

        return isInTime;
      } catch (e) {
        setError(formatVoteError(e));
        return false;
      } finally {
        if (mountedRef.current) setIsSubmitting(false);
      }
    },
    [question, isSubmitting]
  );

  const phase: PollPhase = (() => {
    if (!question) return "loading";
    const active = new Date(question.active_at).getTime();
    const expires = new Date(question.expires_at).getTime();

    if (now < active) return "before-window";
    if (myVote) return now < expires || streakDelta === 1 ? "voted-in-time" : "expired-voted-late";
    if (now >= expires) return "expired-no-vote";
    return curtainOpen ? "voting" : "curtain";
  })();

  return {
    question,
    phase,
    myVote,
    curtainOpen,
    openCurtain,
    submitVote,
    isSubmitting,
    error,
    streakDelta,
    incomingQuestion,
    acceptIncomingQuestion,
  };
}

export function DailyQuestionProvider({ children }: { children: ReactNode }) {
  const value = useDailyQuestionState();
  return <DailyQuestionContext.Provider value={value}>{children}</DailyQuestionContext.Provider>;
}

export function useDailyQuestion(): UseDailyQuestionResult {
  const ctx = useContext(DailyQuestionContext);
  if (!ctx) {
    throw new Error("useDailyQuestion doit être utilisé dans un DailyQuestionProvider");
  }
  return ctx;
}
