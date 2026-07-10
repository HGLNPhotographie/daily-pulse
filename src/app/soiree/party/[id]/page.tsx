"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SoireePlayerList } from "@/components/soiree/SoireePlayerList";
import { SoireePodium } from "@/components/soiree/SoireePodium";
import { SoireeQrCard } from "@/components/soiree/SoireeQrCard";
import { SoireeVoteTimer } from "@/components/soiree/SoireeVoteTimer";
import { SoireeWheel } from "@/components/soiree/SoireeWheel";
import { useSoireeParty } from "@/hooks/useSoireeParty";
import { loadSoireeSession, saveSoireeSession } from "@/lib/soiree/api";
import {
  castSoireeVote,
  closeSoireeRound,
  getSoireeRoundResults,
  markSoireeWritingDone,
  nextSoireeRound,
  startSoireeGame,
  startSoireeWriting,
  submitSoireeQuestion,
} from "@/lib/soiree/rpc";
import type { RpcSession } from "@/lib/soiree/rpc";
import {
  SOIREE_QUESTION_TYPE_LABELS,
  type SoireeQuestionType,
  type SoireeRoundResults,
} from "@/types/soiree";

export default function SoireePartyPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = typeof params.id === "string" ? params.id : null;
  const { party, players, question, isLoading, refresh } = useSoireeParty(partyId);
  const [session, setSession] = useState<RpcSession & { pseudo: string; isHost: boolean } | null>(null);
  const [results, setResults] = useState<SoireeRoundResults | null>(null);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [qType, setQType] = useState<SoireeQuestionType>("member_pick");
  const [qText, setQText] = useState("");
  const [qPour, setQPour] = useState("Pour");
  const [qContre, setQContre] = useState("Contre");
  const [myQuestionCount, setMyQuestionCount] = useState(0);
  const [writingDone, setWritingDone] = useState(false);
  const [lobbySecondsLeft, setLobbySecondsLeft] = useState(0);

  useEffect(() => {
    if (!partyId) return;
    const stored = loadSoireeSession(partyId);
    if (!stored) {
      router.replace("/soiree/join");
      return;
    }
    setSession({
      partyId,
      playerId: stored.playerId,
      sessionSecret: stored.sessionSecret,
      pseudo: stored.pseudo,
      isHost: stored.isHost,
    });
    if (stored.questionCount) setMyQuestionCount(stored.questionCount);
  }, [partyId, router]);

  useEffect(() => {
    if (party?.status !== "lobby" || !party.lobby_expires_at) {
      setLobbySecondsLeft(0);
      return;
    }
    const tick = () => {
      setLobbySecondsLeft(
        Math.max(0, Math.ceil((new Date(party.lobby_expires_at).getTime() - Date.now()) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [party?.status, party?.lobby_expires_at]);

  useEffect(() => {
    if (!session?.playerId) return;
    const me = players.find((p) => p.id === session.playerId);
    if (me) setWritingDone(me.writing_done);
  }, [players, session?.playerId]);

  const rpcSession = useMemo(
    (): RpcSession | null =>
      session
        ? { partyId: session.partyId, playerId: session.playerId, sessionSecret: session.sessionSecret }
        : null,
    [session]
  );

  const otherPlayers = useMemo(
    () => players.filter((p) => p.id !== session?.playerId),
    [players, session?.playerId]
  );

  const allPlayersReady = players.length > 0 && players.every((p) => p.writing_done);

  useEffect(() => {
    if (party?.status === "results" && rpcSession && !results) {
      void getSoireeRoundResults(rpcSession).then((r) => {
        if (r) setResults(r);
      });
    }
  }, [party?.status, rpcSession, results]);

  useEffect(() => {
    if (!party?.round_ends_at || party.status !== "playing") {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(party.round_ends_at!).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && session?.isHost && rpcSession && !results) {
        void closeSoireeRound(rpcSession)
          .then((r) => {
            setResults(r);
            setHasVoted(false);
          })
          .catch(() => null);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [party?.round_ends_at, party?.status, rpcSession, results, session?.isHost]);

  useEffect(() => {
    if (party?.status === "playing" && question) {
      setWheelSpinning(true);
      const t = setTimeout(() => setWheelSpinning(false), 2400);
      return () => clearTimeout(t);
    }
    if (party?.status === "results") setWheelSpinning(false);
  }, [party?.status, question?.id]);

  useEffect(() => {
    setHasVoted(false);
    setResults(null);
  }, [question?.id]);

  const handleStartWriting = async () => {
    if (!rpcSession) return;
    try {
      await startSoireeWriting(rpcSession);
      void fetch("/api/soiree/notify-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: rpcSession.partyId }),
      });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleSubmitQuestion = async () => {
    if (!rpcSession || !party || !session) return;
    if (!qText.trim()) {
      toast.error("Écris une question.");
      return;
    }
    try {
      await submitSoireeQuestion(
        rpcSession,
        qType,
        qText,
        qType === "pour_contre" ? qPour : undefined,
        qType === "pour_contre" ? qContre : undefined
      );
      setMyQuestionCount((c) => {
        const next = c + 1;
        saveSoireeSession(rpcSession.partyId, {
          playerId: rpcSession.playerId,
          sessionSecret: rpcSession.sessionSecret,
          pseudo: session.pseudo,
          isHost: session.isHost,
          questionCount: next,
        });
        return next;
      });
      setQText("");
      toast.success("Question ajoutée !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleWritingDone = async () => {
    if (!rpcSession) return;
    if (myQuestionCount < 1) {
      toast.error("Ajoute au moins une question avant de terminer.");
      return;
    }
    try {
      await markSoireeWritingDone(rpcSession);
      setWritingDone(true);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleStartGame = async () => {
    if (!rpcSession) return;
    try {
      await startSoireeGame(rpcSession);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleVoteMember = async (targetId: string) => {
    if (!rpcSession || !question || hasVoted) return;
    try {
      await castSoireeVote(rpcSession, question.id, { targetPlayerId: targetId });
      setHasVoted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleVotePourContre = async (choice: "pour" | "contre") => {
    if (!rpcSession || !question || hasVoted) return;
    try {
      await castSoireeVote(rpcSession, question.id, { choice });
      setHasVoted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleNextRound = async () => {
    if (!rpcSession) return;
    try {
      const next = await nextSoireeRound(rpcSession);
      setResults(null);
      if (next.finished) {
        toast.success("Partie terminée !");
        router.push("/soiree");
        return;
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (isLoading || !party || !session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
      </div>
    );
  }

  if (party.status === "finished" || party.status === "expired") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Partie terminée</p>
        <Button onClick={() => router.push("/soiree")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 bg-white px-4 pt-6 pb-8">
      {party.status === "lobby" && (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          {session.isHost && <SoireeQrCard joinCode={party.join_code} />}
          {lobbySecondsLeft > 0 && (
            <p className="text-center text-sm text-black/45">
              Expire dans {Math.floor(lobbySecondsLeft / 60)}:
              {String(lobbySecondsLeft % 60).padStart(2, "0")}
            </p>
          )}
          <SoireePlayerList players={players} maxPlayers={party.max_players} />
          {session.isHost ? (
            <Button className="w-full" onClick={() => void handleStartWriting()}>
              Démarrer la partie
            </Button>
          ) : (
            <p className="text-center text-sm text-black/45">En attente de l&apos;hôte…</p>
          )}
        </div>
      )}

      {party.status === "writing" && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <SoireePlayerList players={players} maxPlayers={party.max_players} showWritingStatus />

          <p className="text-center text-sm text-black/55">
            Tes questions (anonymes) · {myQuestionCount}/{party.max_questions_per_player}
          </p>

          {!writingDone && myQuestionCount < party.max_questions_per_player && (
            <div className="space-y-3 rounded-2xl border border-black/8 p-4">
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as SoireeQuestionType)}
                className="w-full rounded-xl border border-black/10 p-2 text-sm"
              >
                {(Object.keys(SOIREE_QUESTION_TYPE_LABELS) as SoireeQuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {SOIREE_QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder={
                  qType === "pour_contre"
                    ? "Ton affirmation (ex : Le mariage, c'est dépassé)"
                    : "Ta question"
                }
                rows={3}
                className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none"
              />
              {qType === "pour_contre" && (
                <div className="flex gap-2">
                  <input
                    value={qPour}
                    onChange={(e) => setQPour(e.target.value)}
                    className="flex-1 rounded-xl border border-black/10 p-2 text-sm"
                  />
                  <input
                    value={qContre}
                    onChange={(e) => setQContre(e.target.value)}
                    className="flex-1 rounded-xl border border-black/10 p-2 text-sm"
                  />
                </div>
              )}
              <Button type="button" className="w-full" onClick={() => void handleSubmitQuestion()}>
                Ajouter la question
              </Button>
            </div>
          )}

          {!writingDone && (
            <Button type="button" variant="outline" className="w-full" onClick={() => void handleWritingDone()}>
              J&apos;ai terminé
            </Button>
          )}
          {writingDone && (
            <p className="text-center text-sm text-emerald-600">Tu es prêt · en attente des autres</p>
          )}

          {session.isHost && (
            <Button
              className="w-full"
              disabled={!allPlayersReady}
              onClick={() => void handleStartGame()}
            >
              {allPlayersReady ? "Lancer les manches" : "En attente de tous les joueurs"}
            </Button>
          )}
        </div>
      )}

      {(party.status === "playing" || party.status === "results") && question && (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
          <SoireeWheel spinning={wheelSpinning} />

          {!wheelSpinning && (
            <>
              <div className="w-full rounded-2xl bg-black px-4 py-6 text-center text-white">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  {SOIREE_QUESTION_TYPE_LABELS[question.question_type]}
                </p>
                <p className="mt-2 text-lg font-semibold leading-snug">{question.text}</p>
                {party.status === "playing" && (
                  <div className="mt-4">
                    <SoireeVoteTimer secondsLeft={secondsLeft} totalSeconds={party.answer_seconds} />
                  </div>
                )}
              </div>

              {party.status === "playing" && !hasVoted && question.question_type === "pour_contre" && (
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => void handleVotePourContre("pour")}>
                    {question.label_pour ?? "Pour"}
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => void handleVotePourContre("contre")}>
                    {question.label_contre ?? "Contre"}
                  </Button>
                </div>
              )}

              {party.status === "playing" && !hasVoted && question.question_type !== "pour_contre" && (
                <div className="grid w-full grid-cols-2 gap-2">
                  {otherPlayers.map((p) => (
                    <Button key={p.id} variant="outline" onClick={() => void handleVoteMember(p.id)}>
                      {p.pseudo}
                    </Button>
                  ))}
                </div>
              )}

              {hasVoted && party.status === "playing" && (
                <p className="text-sm text-black/45">Vote enregistré — résultats dans {secondsLeft}s</p>
              )}

              {results && (
                <>
                  <SoireePodium
                    questionType={results.question_type}
                    text={results.text}
                    labelPour={results.label_pour}
                    labelContre={results.label_contre}
                    pour={results.pour}
                    contre={results.contre}
                    podium={results.podium}
                    fingerVotes={results.finger_votes}
                  />
                  {session.isHost ? (
                    <Button className="w-full" onClick={() => void handleNextRound()}>
                      Manche suivante
                    </Button>
                  ) : (
                    <p className="text-center text-sm text-black/45">En attente de l&apos;hôte…</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
