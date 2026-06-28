import { useState, useEffect, useRef } from "react";
import { Swords, Users, Loader2, Clock, CheckCircle2, XCircle, Trophy, BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpacePet } from "@/hooks/useSpacePet";
import { cn } from "@/lib/utils";

interface ClassroomClashLobbyProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  lobbyId: string;
  hostName: string;
  role: "host" | "guest";
  onCompleted?: () => void;
}

interface Player {
  id: string;
  name: string;
  score: number;
  answered: boolean;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const GENERATE_QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

// Sound synthesizer using Web Audio API
const playClashSound = (type: "beep" | "laser" | "correct" | "victory" | "nudge") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "beep") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "nudge") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "laser") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === "victory") {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50];
      osc.type = "triangle";
      notes.forEach((f, i) => {
        osc.frequency.setValueAtTime(f, now + i * 0.06);
      });
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start();
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Ignore context issues
  }
};

export function ClassroomClashLobby({
  isOpen,
  onClose,
  topic,
  lobbyId,
  hostName,
  role,
  onCompleted
}: ClassroomClashLobbyProps) {
  const petHook = useSpacePet();
  const navigateRef = useRef<any>(null);
  
  // Players inside lobby
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<"lobby" | "generating" | "battle" | "results">("lobby");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User round values
  const [userSelection, setUserSelection] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [nudgeAlert, setNudgeAlert] = useState(false);

  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState("Cadet");
  const [currentXp, setCurrentXp] = useState(0);

  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolve user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.full_name) setStudentName(profile.full_name);

        const { data: student } = await supabase
          .from("students")
          .select("id, xp_points")
          .eq("user_id", user.id)
          .single();
        if (student) {
          setStudentId(student.id);
          setCurrentXp(student.xp_points || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (isOpen) {
      fetchUser();
      setPhase("lobby");
      setPlayers([]);
      setCurrentIndex(0);
      setQuestions([]);
      setUserSelection(null);
      setShowResult(false);
      setNudgeAlert(false);
    }
  }, [isOpen]);

  // Connect to Supabase Realtime Broadcast scoped to the lobbyId
  useEffect(() => {
    if (!lobbyId || !studentName || !studentId) return;

    const channel = supabase.channel(`clash_lobby_${lobbyId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "player_joined" }, (payload) => {
        const data = payload.payload;
        setPlayers((prev) => {
          if (prev.some(p => p.id === data.id)) return prev;
          const next = [...prev, { id: data.id, name: data.name, score: 0, answered: false }];
          
          // If we are host, broadcast the updated player registry
          if (role === "host") {
            channel.send({
              type: "broadcast",
              event: "sync_players",
              payload: { players: next }
            });
          }
          return next;
        });
      })
      .on("broadcast", { event: "sync_players" }, (payload) => {
        if (role === "guest") {
          setPlayers(payload.payload.players);
        }
      })
      .on("broadcast", { event: "quiz_started" }, (payload) => {
        if (role === "guest") {
          setQuestions(payload.payload.questions);
          setPhase("battle");
          setTimeLeft(20);
        }
      })
      .on("broadcast", { event: "answer_submitted" }, (payload) => {
        const data = payload.payload;
        setPlayers((prev) =>
          prev.map(p =>
            p.id === data.playerId
              ? { ...p, score: p.score + data.pointsEarned, answered: true }
              : p
          )
        );
      })
      .on("broadcast", { event: "next_round" }, () => {
        if (role === "guest") {
          setCurrentIndex(prev => prev + 1);
          setUserSelection(null);
          setShowResult(false);
          setTimeLeft(20);
          setNudgeAlert(false);
          setPlayers(prev => prev.map(p => ({ ...p, answered: false })));
        }
      })
      .on("broadcast", { event: "nudge_alert" }, () => {
        if (role === "guest" && userSelection === null) {
          playClashSound("nudge");
          setNudgeAlert(true);
          toast.warning("🚨 Hurry Up! Your classmates are waiting!");
          setTimeout(() => setNudgeAlert(false), 3000);
        }
      })
      .on("broadcast", { event: "clash_ended" }, () => {
        if (role === "guest") {
          setPhase("results");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce connection
          channel.send({
            type: "broadcast",
            event: "player_joined",
            payload: { id: studentId, name: studentName }
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, studentName, studentId, role]);

  // Timed battle loop
  useEffect(() => {
    if (phase !== "battle" || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        if (prev <= 6) playClashSound("beep");
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex, questions]);

  // Auto reveal round results when all joined players have answered
  useEffect(() => {
    if (phase === "battle" && players.length > 0 && players.every(p => p.answered) && !showResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      setShowResult(true);
      toast.info("All pilots have responded! Round locked.");
    }
  }, [players, phase, showResult]);

  const handleStartGame = async () => {
    setPhase("generating");
    try {
      const resp = await fetch(GENERATE_QUIZ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          topic,
          difficulty: "medium",
          questionCount: 5,
          studentId: studentId || undefined,
        }),
      });

      if (!resp.ok) throw new Error("Could not assemble multiplayer quiz");

      const data = await resp.json();
      if (!data?.questions || data.questions.length === 0) throw new Error("No questions received");

      setQuestions(data.questions);
      setPhase("battle");
      setTimeLeft(20);

      // Broadcast questions to everyone
      channelRef.current?.send({
        type: "broadcast",
        event: "quiz_started",
        payload: { questions: data.questions }
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start quiz.");
      setPhase("lobby");
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (showResult || userSelection !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setUserSelection(optionIndex);
    setShowResult(true);

    const correctIndex = Number(questions[currentIndex].correct);
    const isCorrect = optionIndex === correctIndex;

    const secondsTaken = 20 - timeLeft;
    // Speed weighted scoring: base 10 points + speed bonus
    const pointsEarned = isCorrect
      ? Math.max(10, Math.round(20 - (secondsTaken * 0.5)))
      : 0;

    if (isCorrect) {
      playClashSound("correct");
      toast.success(`Correct! +${pointsEarned} Speed Points! 🎯`);
    } else {
      playClashSound("laser");
      toast.error("Incorrect response.");
    }

    // Broadcast submission
    channelRef.current?.send({
      type: "broadcast",
      event: "answer_submitted",
      payload: { playerId: studentId, pointsEarned }
    });

    // Update locally too
    setPlayers(prev =>
      prev.map(p =>
        p.id === studentId
          ? { ...p, score: p.score + pointsEarned, answered: true }
          : p
      )
    );
  };

  const handleTimeOut = () => {
    setUserSelection(-1);
    setShowResult(true);
    playClashSound("laser");
    toast.error("Time Expired! ⏳");

    channelRef.current?.send({
      type: "broadcast",
      event: "answer_submitted",
      payload: { playerId: studentId, pointsEarned: 0 }
    });

    setPlayers(prev =>
      prev.map(p =>
        p.id === studentId
          ? { ...p, answered: true }
          : p
      )
    );
  };

  const handleNudgeClass = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "nudge_alert",
      payload: {}
    });
    toast.success("Nudged all thinking players! 📢");
  };

  const handleNextRound = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserSelection(null);
      setShowResult(false);
      setTimeLeft(20);
      setPlayers(prev => prev.map(p => ({ ...p, answered: false })));

      // Broadcast transition
      channelRef.current?.send({
        type: "broadcast",
        event: "next_round",
        payload: {}
      });
    } else {
      handleClashFinish();
    }
  };

  const handleClashFinish = async () => {
    setPhase("results");

    // Broadcast completion to guest players
    channelRef.current?.send({
      type: "broadcast",
      event: "clash_ended",
      payload: {}
    });

    // Determine ranking
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const userRank = sorted.findIndex(p => p.id === studentId) + 1;

    let coinReward = 5;
    let xpReward = 10;

    if (userRank === 1) {
      coinReward = 50;
      xpReward = 50;
      playClashSound("victory");
    } else if (userRank === 2) {
      coinReward = 30;
      xpReward = 30;
      playClashSound("correct");
    } else if (userRank === 3) {
      coinReward = 15;
      xpReward = 20;
      playClashSound("correct");
    }

    // Award rewards
    await petHook.buyAccessory({
      id: `clash_reward_${Date.now()}`,
      name: `Clash Podium Earnings`,
      description: `Podium finish`,
      cost: -coinReward, // adds coins
      emoji: "🪙",
      type: "helmet"
    });

    if (studentId) {
      const nextXp = currentXp + xpReward;
      try {
        await supabase
          .from("students")
          .update({ xp_points: nextXp })
          .eq("id", studentId);
        
        window.dispatchEvent(new CustomEvent("xp-changed", { detail: nextXp }));
      } catch (err) {
        console.error(err);
      }
    }

    onCompleted?.();
  };

  const currentQ = questions[currentIndex];
  const roundProgress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = players.filter(p => p.answered).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-[0_0_40px_rgba(20,250,220,0.15)] text-foreground">
        
        {/* Phase 1: Lobby */}
        {phase === "lobby" && (
          <div className="space-y-6 py-4">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Swords className="w-6 h-6 text-secondary animate-pulse" />
                Classroom Clash Lobby
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Challenge Lobby Scoped Room: <span className="font-mono text-secondary font-bold">{lobbyId}</span>
              </p>
            </DialogHeader>

            <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-4">
              <h4 className="font-display text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Joined Crew ({players.length})
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-h-[120px] align-top">
                {players.map((player) => (
                  <div key={player.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-border/60 flex items-center gap-2">
                    <span className="text-xl">🧑‍🚀</span>
                    <span className="text-xs font-bold text-foreground truncate">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="border-border text-foreground" onClick={onClose}>
                Leave Lobby
              </Button>
              {role === "host" ? (
                <Button
                  className="bg-secondary hover:bg-secondary/95 text-background font-display font-semibold uppercase tracking-wider text-xs px-6"
                  onClick={handleStartGame}
                  disabled={players.length === 0}
                >
                  Start Battle Deck
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for Pilot Commander to launch...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Generating quiz */}
        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-secondary" />
            <div>
              <p className="font-display text-base font-bold text-foreground">Assembling Clash Deck...</p>
              <p className="text-xs text-muted-foreground mt-1">Calibrating synchronized parameters for topic: {topic}</p>
            </div>
          </div>
        )}

        {/* Phase 3: Clash battle */}
        {phase === "battle" && currentQ && (
          <div className="space-y-6">
            
            {/* Sync Header */}
            <div className="grid grid-cols-3 items-center bg-slate-950/60 p-4 border border-border/80 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
              
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Crew Size</span>
                <span className="text-base font-bold text-foreground font-mono">{players.length} Pilots</span>
              </div>

              <div className="flex flex-col items-center space-y-1 z-10">
                <div className="w-12 h-12 rounded-full border-2 border-secondary flex items-center justify-center text-center font-mono font-extrabold text-lg text-secondary bg-background animate-pulse">
                  {timeLeft}s
                </div>
                <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">Countdown</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Responses</span>
                <span className="text-base font-bold text-foreground font-mono">{answeredCount} / {players.length}</span>
              </div>
            </div>

            {/* Global nudge alerts overlay */}
            {nudgeAlert && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs font-mono text-center text-destructive flex items-center justify-center gap-2 animate-bounce">
                <BellRing className="w-4 h-4 animate-ping" />
                HURRY UP! Opponents are waiting for your submission!
              </div>
            )}

            {/* Questions Card */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-base font-bold text-foreground mb-6">{currentQ.question}</p>

                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isUserChoice = userSelection === idx;
                    const isCorrect = idx === Number(currentQ.correct);
                    const isHost = role === "host";

                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left h-auto py-3 px-4 transition-all duration-300",
                          isHost && "pointer-events-none cursor-default",
                          showResult
                            ? isCorrect
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : isUserChoice
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border opacity-70"
                            : isHost
                            ? "border-border"
                            : "border-border hover:border-secondary"
                        )}
                        onClick={() => {
                          if (!isHost) handleAnswer(idx);
                        }}
                        disabled={showResult || isHost}
                      >
                        <span className="mr-3 font-bold">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                        {showResult && isCorrect && <CheckCircle2 className="ml-auto w-5 h-5 text-green-500" />}
                        {showResult && isUserChoice && !isCorrect && <XCircle className="ml-auto w-5 h-5 text-destructive" />}
                      </Button>
                    );
                  })}
                </div>

                {showResult && (
                  <div className="mt-4 p-4 rounded-lg bg-muted border border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {currentQ.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Responder Status Grid */}
            <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2 text-left">
              <h5 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Classroom Crew Status</span>
                <span className="text-[9px] text-secondary font-bold">Answered: {answeredCount} / {players.length}</span>
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-border/60 text-[10px] font-mono">
                    <span className="truncate max-w-[80px] text-foreground font-semibold" title={p.name}>{p.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-secondary font-bold">{p.score} pts</span>
                      {p.answered ? (
                        <span className="text-green-400 font-bold" title="Locked in answer">✓</span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" title="Thinking..." />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Round advancement */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-mono">
                Round {currentIndex + 1} of {questions.length}
              </span>
              
              {role === "host" ? (
                <div className="flex gap-2">
                  {answeredCount < players.length && (
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-destructive text-destructive hover:bg-destructive/10" onClick={handleNudgeClass}>
                      <BellRing className="w-3.5 h-3.5" />
                      Nudge Slow Responders
                    </Button>
                  )}
                  <Button onClick={handleNextRound} disabled={!showResult} className="bg-secondary hover:bg-secondary/90 text-background font-display font-bold uppercase tracking-wider text-xs">
                    {currentIndex < questions.length - 1 ? "Next Synchronized Question" : "See Battle Results"}
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  Waiting for pilot commander host to advance...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase 4: Results Podium */}
        {phase === "results" && (
          <div className="text-center py-8 space-y-6">
            <Trophy className="w-16 h-16 text-secondary mx-auto mb-4 animate-bounce" />
            
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-extrabold text-foreground uppercase tracking-widest">
                Podium Verdict
              </h3>
              <p className="text-sm text-muted-foreground">
                Classroom Clash Leaderboard
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950/60 border border-border space-y-2">
              {[...players].sort((a, b) => b.score - a.score).map((p, idx) => {
                const isMe = p.id === studentId;
                return (
                  <div key={p.id} className={cn(
                    "flex justify-between items-center p-2.5 rounded-lg border text-xs font-mono",
                    isMe ? "border-secondary/40 bg-secondary/5" : "border-border/60 bg-muted/30"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-secondary">#{idx + 1}</span>
                      <span className={cn("font-bold", isMe ? "text-secondary" : "text-foreground")}>{p.name} {isMe ? "(You)" : ""}</span>
                    </div>
                    <span className="font-bold text-foreground">{p.score} PTS</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" className="border-border text-foreground" onClick={onClose}>
                Return to Quizzes
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
