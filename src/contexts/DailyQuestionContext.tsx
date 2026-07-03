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
import { isQuestionLiveForUsers } from "@/lib/question-active";
import { withQuestionOptions } from "@/lib/question-options";
import type { PollPhase, Question, VoteChoice } from "@/types";

const CURTAIN_CLOSE_MS = 950;

function formatVoteError(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    if (err.message?.includes("USER_PROFILE_MISSING")) {
      return "Profil introuvable. Rafraîchis la page pour obtenir une nouvelle session invitée.";
    }
    if (err.message?.includes("AUTH_REQUIRED")) {
      return "Tu n'es pas connecté. Rafraîchis la page, ou active « Anonymous Sign-Ins » dans Supabase (Authentication → Providers).";
    }
    if (err.message?.includes("USER_BANNED")) {
      return "Ton compte a été suspendu. Contacte l'équipe si tu penses qu'il s'agit d'une erreur.";
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
  isCurtainClosing: boolean;
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
  const [isCurtainClosing, setIsCurtainClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streakDelta, setStreakDelta] = useState<0 | 1>(0);
  const [incomingQuestion, setIncomingQuestion] = useState<Question | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mountedRef = useRef(true);
  const currentQuestionIdRef = useRef<string | null>(null);
  const questionRef = useRef<Question | null>(null);
  const myVoteRef = useRef<VoteChoice | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentQuestionIdRef.current = question?.id ?? null;
    questionRef.current = question;
  }, [question]);

  useEffect(() => {
    myVoteRef.current = myVote;
  }, [myVote]);

  const clearQuestionState = useCallback(() => {
    closingRef.current = false;
    setQuestion(null);
    setMyVote(null);
    setStreakDelta(0);
    setCurtainOpen(false);
    setIsCurtainClosing(false);
  }, []);

  const closeCurtainThenClear = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsCurtainClosing(true);
    setCurtainOpen(false);
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      clearQuestionState();
    }, CURTAIN_CLOSE_MS);
  }, [clearQuestionState]);

  const handleQuestionRemoved = useCallback(
    (deletedId: string) => {
      if (currentQuestionIdRef.current === deletedId) {
        clearQuestionState();
      }
      setIncomingQuestion((q) => (q?.id === deletedId ? null : q));
    },
    [clearQuestionState]
  );

  const applyIncomingQuestion = useCallback((normalized: Question) => {
    setQuestion(normalized);
    setMyVote(null);
    setStreakDelta(0);
    setCurtainOpen(false);
    setIncomingQuestion(null);
    setIsCurtainClosing(false);
    closingRef.current = false;
  }, []);

  const applyLiveQuestion = useCallback(
    (updated: Question) => {
      if (!mountedRef.current) return;
      const normalized = withQuestionOptions(updated);
      if (!isQuestionLiveForUsers(updated)) return;

      const currentId = currentQuestionIdRef.current;
      const current = questionRef.current;

      if (!currentId || !current) {
        applyIncomingQuestion(normalized);
        return;
      }

      if (currentId === normalized.id) {
        setQuestion(normalized);
        return;
      }

      if (!isQuestionLiveForUsers(current)) {
        applyIncomingQuestion(normalized);
        return;
      }

      setIncomingQuestion(normalized);
    },
    [applyIncomingQuestion]
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Expire sans vote → refermer le rideau. Après un vote, on garde les résultats
  // visibles jusqu'à la prochaine question.
  useEffect(() => {
    if (!question || isCurtainClosing || myVote) return;
    if (!isQuestionLiveForUsers(question, now)) {
      closeCurtainThenClear();
    }
  }, [now, question, isCurtainClosing, myVote, closeCurtainThenClear]);

  useEffect(() => {
    if (isSupabaseConfigured) return;

    let cancelled = false;

    const loadVoteForQuestion = (q: Question) => {
      clearDemoVoteForQuestion(q.id);
      const existing = getDemoVote();
      if (existing && existing.choice) {
        setMyVote(existing.choice);
        setStreakDelta(existing.isInTime ? 1 : 0);
        setCurtainOpen(true);
      } else {
        setMyVote(null);
        setStreakDelta(0);
        setCurtainOpen(false);
      }
    };

    (async () => {
      try {
        const q = await fetchDemoQuestion();
        if (cancelled || !mountedRef.current) return;
        if (q && isQuestionLiveForUsers(q)) {
          setQuestion(withQuestionOptions(q));
          loadVoteForQuestion(q);
        } else {
          clearQuestionState();
        }
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Impossible de charger la question démo.");
        }
      } finally {
        if (!cancelled && mountedRef.current) setInitialLoaded(true);
      }
    })();

    const unsubscribe = subscribeDemoLiveActivity((updated) => {
      if (!updated) {
        clearQuestionState();
        setIncomingQuestion(null);
        return;
      }
      const prevId = currentQuestionIdRef.current;
      if (prevId && prevId !== updated.id) {
        setMyVote(null);
        setStreakDelta(0);
        setCurtainOpen(false);
      }
      clearDemoVoteForQuestion(updated.id);
      if (!isQuestionLiveForUsers(updated)) {
        if (prevId === updated.id && !closingRef.current && !myVoteRef.current) closeCurtainThenClear();
        return;
      }
      applyLiveQuestion(updated);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyLiveQuestion, clearQuestionState, closeCurtainThenClear]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    const newQuestionChannel = supabase
      .channel("questions-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" }, (payload: RealtimePostgresChangesPayload<Question>) => {
        applyLiveQuestion(payload.new as Question);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "questions" }, (payload: RealtimePostgresChangesPayload<Question>) => {
        applyLiveQuestion(payload.new as Question);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "questions" }, (payload: RealtimePostgresChangesPayload<Question>) => {
        const old = payload.old as { id?: string };
        if (old.id) handleQuestionRemoved(old.id);
      })
      .subscribe();

    void (async () => {
      await ensureVoterSession(supabase).catch((e) => {
        if (!cancelled && mountedRef.current) setError(formatVoteError(e));
      });
      if (cancelled) return;

      const nowIso = new Date().toISOString();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;

      const { data: liveQuestion, error: qError } = await supabase
        .from("questions")
        .select("*")
        .lte("active_at", nowIso)
        .gt("expires_at", nowIso)
        .order("active_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (qError) setError(qError.message);

      let resolvedQuestion = liveQuestion as Question | null;

      if (!resolvedQuestion && uid) {
        const { data: lastVote } = await supabase
          .from("votes")
          .select("choice, is_in_time, question_id")
          .eq("user_id", uid)
          .order("voted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastVote?.question_id) {
          const { data: votedQuestion } = await supabase
            .from("questions")
            .select("*")
            .eq("id", lastVote.question_id)
            .maybeSingle();

          if (votedQuestion && mountedRef.current) {
            resolvedQuestion = votedQuestion as Question;
            setMyVote(lastVote.choice as VoteChoice);
            setStreakDelta(lastVote.is_in_time ? 1 : 0);
            setCurtainOpen(true);
          }
        }
      }

      if (resolvedQuestion && mountedRef.current) {
        setQuestion(withQuestionOptions(resolvedQuestion));

        if (uid && liveQuestion && liveQuestion.id === resolvedQuestion.id) {
          const { data: existingVote } = await supabase
            .from("votes")
            .select("choice, is_in_time")
            .eq("question_id", resolvedQuestion.id)
            .eq("user_id", uid)
            .maybeSingle();
          if (!cancelled && existingVote && mountedRef.current) {
            setMyVote(existingVote.choice as VoteChoice);
            setStreakDelta(existingVote.is_in_time ? 1 : 0);
            setCurtainOpen(true);
          }
        }
      } else if (mountedRef.current) {
        clearQuestionState();
      }

      if (!cancelled && mountedRef.current) setInitialLoaded(true);
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(newQuestionChannel);
    };
  }, [applyLiveQuestion, clearQuestionState, handleQuestionRemoved]);

  // Filet de sécurité si Realtime rate un INSERT (ex. onglet en arrière-plan).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const pollLiveQuestion = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("questions")
        .select("*")
        .lte("active_at", nowIso)
        .gt("expires_at", nowIso)
        .order("active_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) applyLiveQuestion(data as Question);
    };

    const id = window.setInterval(() => void pollLiveQuestion(), 12_000);
    return () => window.clearInterval(id);
  }, [applyLiveQuestion]);

  // Réabonnement Realtime quand la question affichée change.
  useEffect(() => {
    if (!isSupabaseConfigured || !question?.id) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`question-${question.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "questions", filter: `id=eq.${question.id}` },
        (payload: RealtimePostgresChangesPayload<Question>) => applyLiveQuestion(payload.new as Question)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "questions", filter: `id=eq.${question.id}` },
        () => handleQuestionRemoved(question.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [question?.id, applyLiveQuestion, handleQuestionRemoved]);

  const openCurtain = useCallback(() => setCurtainOpen(true), []);

  const acceptIncomingQuestion = useCallback(() => {
    if (!incomingQuestion) return;
    applyIncomingQuestion(withQuestionOptions(incomingQuestion));
  }, [incomingQuestion, applyIncomingQuestion]);

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
        setCurtainOpen(true);

        const { data: refreshed } = await supabase
          .from("questions")
          .select("*")
          .eq("id", question.id)
          .maybeSingle();
        if (refreshed && mountedRef.current) {
          setQuestion(withQuestionOptions(refreshed as Question));
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
    if (!initialLoaded) return "loading";
    if (!question) return "no-question";
    if (isCurtainClosing) {
      if (myVote) return "voted-in-time";
      return curtainOpen ? "voting" : "curtain";
    }
    if (myVote) return "voted-in-time";
    if (!isQuestionLiveForUsers(question, now)) return "no-question";

    const expires = new Date(question.expires_at).getTime();
    if (now >= expires) return "no-question";
    return curtainOpen ? "voting" : "curtain";
  })();

  return {
    question,
    phase,
    myVote,
    curtainOpen,
    isCurtainClosing,
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
