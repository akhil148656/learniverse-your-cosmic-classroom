import { useState, useEffect, useRef } from "react";
import { HelpCircle, CheckCircle2, XCircle, Loader2, Trophy, Shield, Swords, Brain, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpacePet } from "@/hooks/useSpacePet";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Rival {
  id: string;
  name: string;
  emoji: string;
  accuracy: number; // 0 to 1
  minSpeed: number; // seconds
  maxSpeed: number; // seconds
  cost: number;
  multiplier: number;
  description: string;
  color: string;
}

const RIVALS: Rival[] = [
  { id: "cadet_bot", name: "Cadet Bot", emoji: "🤖", accuracy: 0.5, minSpeed: 10, maxSpeed: 16, cost: 0, multiplier: 1, description: "Standard training drone. Average speed, moderate accuracy.", color: "from-slate-500 to-slate-700" },
  { id: "nova_droid", name: "Nova Droid", emoji: "👾", accuracy: 0.72, minSpeed: 6, maxSpeed: 12, cost: 10, multiplier: 2, description: "Fast responder with advanced logic circuitry.", color: "from-cyan-500 to-blue-600" },
  { id: "quasar_master", name: "Quasar Master", emoji: "🧠", accuracy: 0.88, minSpeed: 4, maxSpeed: 8, cost: 20, multiplier: 3, description: "Cosmic mind. Rapid response time and high intelligence.", color: "from-purple-500 to-indigo-600" }
];

interface QuizDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  onCompleted?: () => void;
}

const GENERATE_QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

// Sound synthesizer using Web Audio API
const playSynthSound = (type: "victory" | "defeat" | "correct" | "laser" | "tick") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "tick") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "correct") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "laser") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "victory") {
      osc.type = "sine";
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio
      notes.forEach((f, i) => {
        osc.frequency.setValueAtTime(f, now + i * 0.07);
      });
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start();
      osc.stop(now + 0.6);
    } else if (type === "defeat") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    // Ignore audio context blockages
  }
};

export function QuizDuelModal({ isOpen, onClose, topic, onCompleted }: QuizDuelModalProps) {
  const petHook = useSpacePet();
  const [selectedRival, setSelectedRival] = useState<Rival | null>(null);
  const [phase, setPhase] = useState<"select_rival" | "loading" | "battle" | "results">("select_rival");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Scores
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [userSelection, setUserSelection] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Timers & AI decisions
  const [timeLeft, setTimeLeft] = useState(20);
  const [aiAnswerSecond, setAiAnswerSecond] = useState<number>(10); // at what second AI answers
  const [aiChoice, setAiChoice] = useState<number>(0);
  const [aiStatus, setAiStatus] = useState<"thinking" | "answered">("thinking");
  const [battleLog, setBattleLog] = useState<string>("");

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Cadet");
  const [currentXp, setCurrentXp] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const quizIdRef = useRef<string | null>(null);
  const userAnswersRef = useRef<{ correct: boolean; time: number }[]>([]);

  // Fetch initial profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
      fetchProfile();
      setPhase("select_rival");
      setSelectedRival(null);
      setCurrentIndex(0);
      setUserScore(0);
      setAiScore(0);
      setQuestions([]);
      userAnswersRef.current = [];
    }
  }, [isOpen]);

  const handleStartDuel = async (rival: Rival) => {
    if (petHook.coins < rival.cost) {
      toast.error(`Challenging ${rival.name} costs ${rival.cost} coins. Attempt quizzes or tasks to earn coins first!`);
      return;
    }

    // Deduct coins if cost > 0
    if (rival.cost > 0) {
      const nextCoins = petHook.coins - rival.cost;
      await petHook.syncPetState({ coins: nextCoins });
      toast.info(`Challenged ${rival.name}! -${rival.cost} coins deducted.`);
    }

    setSelectedRival(rival);
    setPhase("loading");

    const rivalDifficultyTopic = 
      rival.id === "cadet_bot" 
        ? `${topic} (Elementary/Easy Level: basic concepts, simple definitions, direct recall)`
        : rival.id === "nova_droid"
        ? `${topic} (Intermediate/Medium Level: conceptual application, intermediate scenario analysis)`
        : `${topic} (Advanced/Challenging/Hard Level: highly advanced theoretical concepts, complex scenario analysis, tricky multi-step calculations)`;

    // Fetch quiz from Edge Function
    try {
      const resp = await fetch(GENERATE_QUIZ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          topic: rivalDifficultyTopic,
          difficulty: rival.id === "cadet_bot" ? "easy" : rival.id === "nova_droid" ? "medium" : "hard",
          questionCount: 5,
          studentId: studentId || undefined,
        }),
      });

      if (!resp.ok) throw new Error("Could not construct arena quiz parameters");

      const data = await resp.json();
      if (!data?.questions || data.questions.length === 0) throw new Error("Zero questions received");

      quizIdRef.current = data.quizId || null;
      setQuestions(data.questions);
      setPhase("battle");
      setupQuestionRound(data.questions[0], rival);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to enter Arena.");
      setPhase("select_rival");
    }
  };

  const setupQuestionRound = (q: QuizQuestion, rival: Rival) => {
    setTimeLeft(20);
    setUserSelection(null);
    setShowResult(false);
    setAiStatus("thinking");
    setBattleLog("Arena Clash Commenced... Both sides are contemplating.");

    // Precompute AI speed and choice
    const speed = Math.floor(Math.random() * (rival.maxSpeed - rival.minSpeed + 1)) + rival.minSpeed;
    const answerSecond = 20 - speed; // e.g. if speed is 5s, AI answers when timeLeft === 15
    setAiAnswerSecond(answerSecond);

    const isAiCorrect = Math.random() <= rival.accuracy;
    const correctIndex = Number(q.correct);
    if (isAiCorrect) {
      setAiChoice(correctIndex);
    } else {
      // Pick random wrong option
      const wrongOptions = Array.from({ length: q.options.length }, (_, i) => i).filter(i => i !== correctIndex);
      setAiChoice(wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ?? 0);
    }
  };

  // Timer Tick Loop
  useEffect(() => {
    if (phase !== "battle" || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }

        const nextTime = prev - 1;

        // Sound effect tick
        if (nextTime <= 5) playSynthSound("tick");

        // Check if AI answers at this second
        if (aiStatus === "thinking" && nextTime === aiAnswerSecond && selectedRival) {
          setAiStatus("answered");
          const isCorrect = Number(aiChoice) === Number(questions[currentIndex].correct);
          if (isCorrect) setAiScore(s => s + 1);
          setBattleLog(`${selectedRival.emoji} ${selectedRival.name} locked in their response!`);
          playSynthSound("laser");
        }

        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex, questions, aiStatus, aiAnswerSecond, aiChoice, selectedRival]);

  const handleAnswerSelect = (optionIndex: number) => {
    if (showResult || userSelection !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setUserSelection(optionIndex);
    setShowResult(true);

    const correctIndex = Number(questions[currentIndex].correct);
    const isCorrect = optionIndex === correctIndex;
    if (isCorrect) {
      setUserScore(s => s + 1);
      playSynthSound("correct");
    } else {
      playSynthSound("laser");
    }

    userAnswersRef.current.push({ correct: isCorrect, time: 20 - timeLeft });

    // Determine AI choice result
    let wasAiCorrect = false;
    if (aiStatus === "thinking" && selectedRival) {
      setAiStatus("answered");
      wasAiCorrect = Number(aiChoice) === correctIndex;
      if (wasAiCorrect) setAiScore(s => s + 1);
    } else {
      wasAiCorrect = Number(aiChoice) === correctIndex;
    }

    const aiText = wasAiCorrect ? "correctly! ✅" : "incorrectly. ❌";
    setBattleLog(`Verdict: You got it ${isCorrect ? "RIGHT! 🎯" : "WRONG. 💥"} | ${selectedRival?.name} answered ${aiText}`);
  };

  const handleTimeOut = () => {
    setUserSelection(-1); // timed out
    setShowResult(true);
    playSynthSound("laser");
    userAnswersRef.current.push({ correct: false, time: 20 });

    const correctIndex = Number(questions[currentIndex].correct);

    // Determine AI choice result
    let wasAiCorrect = false;
    if (aiStatus === "thinking" && selectedRival) {
      setAiStatus("answered");
      wasAiCorrect = Number(aiChoice) === correctIndex;
      if (wasAiCorrect) setAiScore(s => s + 1);
    } else {
      wasAiCorrect = Number(aiChoice) === correctIndex;
    }

    const aiText = wasAiCorrect ? "correctly! ✅" : "incorrectly. ❌";
    setBattleLog(`Verdict: You TIMED OUT! ⏳ | ${selectedRival?.name} answered ${aiText}`);
  };

  const handleNextRound = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setupQuestionRound(questions[currentIndex + 1], selectedRival!);
    } else {
      handleDuelFinish();
    }
  };

  const handleDuelFinish = async () => {
    setPhase("results");

    let status: "victory" | "defeat" | "draw" = "draw";
    if (userScore > aiScore) status = "victory";
    else if (userScore < aiScore) status = "defeat";

    let xpReward = 10;
    let coinReward = 5;

    if (status === "victory") {
      xpReward = 50;
      coinReward = 30 * (selectedRival?.multiplier || 1);
      playSynthSound("victory");
      toast.success("Cosmic Arena Victory! 🏆 you dominated the duel!");
    } else if (status === "draw") {
      xpReward = 25;
      coinReward = 15 * (selectedRival?.multiplier || 1);
      playSynthSound("correct");
      toast.info("Arena Clash Draw! Perfect equivalence.");
    } else {
      playSynthSound("defeat");
      toast.error("Arena Defeat... Recharge shield batteries and return.");
    }

    // Award direct coin reward to useSpacePet
    await petHook.buyAccessory({
      id: `reward_${Date.now()}`,
      name: `Arena Earnings`,
      description: `Victory payout`,
      cost: -coinReward, // negative cost adds coins!
      emoji: "🪙",
      type: "helmet"
    });

    // Update student XP in database
    if (studentId) {
      const nextXp = currentXp + xpReward;
      try {
        await supabase
          .from("students")
          .update({ xp_points: nextXp })
          .eq("id", studentId);
        
        // Trigger topbar level sync
        window.dispatchEvent(new CustomEvent("xp-changed", { detail: nextXp }));
      } catch (err) {
        console.error(err);
      }

      // Record attempt in Supabase
      try {
        await supabase.from("quiz_attempts").insert({
          quiz_id: quizIdRef.current || undefined,
          student_id: studentId,
          score: Math.round((userScore / questions.length) * 100),
          accuracy: Math.round((userScore / questions.length) * 100),
          mode: "duel" as any,
          xp_earned: xpReward,
          time_taken_seconds: userAnswersRef.current.reduce((sum, a) => sum + a.time, 0),
          completed_at: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
      }
    }

    onCompleted?.();
  };

  const currentQ = questions[currentIndex];
  const roundProgress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-[0_0_40px_rgba(20,250,220,0.15)] text-foreground">
        
        {/* Phase 1: Rival Select */}
        {phase === "select_rival" && (
          <div className="space-y-6 py-4">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Swords className="w-6 h-6 text-secondary animate-pulse" />
                Select Arena AI Rival
              </DialogTitle>
              <p className="text-muted-foreground text-xs">
                Challenging stronger rivals yields high payouts of **Cosmic Coins**, but carries entry costs!
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {RIVALS.map((rival) => {
                const canAfford = petHook.coins >= rival.cost;
                return (
                  <Card key={rival.id} className="bg-muted/30 border border-border hover:border-secondary transition-all duration-300">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-border flex items-center justify-center text-3xl">
                        {rival.emoji}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-foreground">{rival.name}</h4>
                        <p className="text-[10px] text-secondary font-mono mt-0.5">X{rival.multiplier} Multiplier</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground min-h-[50px]">{rival.description}</p>
                      
                      <div className="w-full pt-2">
                        <Button
                          className="w-full bg-secondary hover:bg-secondary/90 text-background font-display text-xs font-semibold uppercase tracking-wider h-9"
                          onClick={() => handleStartDuel(rival)}
                          disabled={!canAfford}
                        >
                          {rival.cost > 0 ? `Entry: 🪙 ${rival.cost}` : "Free Duel"}
                        </Button>
                        {!canAfford && (
                          <span className="text-[9px] text-destructive mt-1 block">Need more coins</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase 2: Loading Arena parameters */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-secondary" />
            <div>
              <p className="font-display text-base font-bold text-foreground">Assembling Cosmic Arena Deck...</p>
              <p className="text-xs text-muted-foreground mt-1">Calibrating navigation parameters for {topic}</p>
            </div>
          </div>
        )}

        {/* Phase 3: Timed Battle Arena */}
        {phase === "battle" && currentQ && (
          <div className="space-y-6">
            
            {/* Clash Header Panels */}
            <div className="grid grid-cols-3 items-center bg-slate-950/60 p-4 border border-border/80 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
              
              {/* Student Panel */}
              <div className="flex flex-col items-center text-center space-y-1">
                <span className="text-2xl">🐶</span> {/* Puppy avatar represents the student's buddy desk */}
                <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{studentName}</span>
                <span className="text-xs font-mono text-primary font-bold">Score: {userScore} / 5</span>
              </div>

              {/* Center Clash indicator */}
              <div className="flex flex-col items-center space-y-1 z-10">
                <div className="w-12 h-12 rounded-full border-2 border-secondary flex items-center justify-center text-center font-mono font-extrabold text-lg text-secondary bg-background animate-pulse">
                  {timeLeft}s
                </div>
                <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">Time Remaining</span>
              </div>

              {/* AI Rival Panel */}
              <div className="flex flex-col items-center text-center space-y-1">
                <span className="text-2xl">{selectedRival?.emoji}</span>
                <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{selectedRival?.name}</span>
                <span className="text-xs font-mono text-secondary font-bold">Score: {aiScore} / 5</span>
              </div>
            </div>

            {/* Arena battle logs */}
            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-xs font-mono text-center text-secondary">
              🤖 {battleLog}
            </div>

            {/* Questions Card */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <p className="text-base font-bold text-foreground mb-6">{currentQ.question}</p>

                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isUserChoice = userSelection === idx;
                    const isCorrect = idx === currentQ.correct;

                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left h-auto py-3 px-4 transition-all duration-300",
                          showResult
                            ? isCorrect
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : isUserChoice
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border opacity-70"
                            : "border-border hover:border-secondary"
                        )}
                        onClick={() => handleAnswerSelect(idx)}
                        disabled={showResult}
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

            {/* Battle Next step */}
            {showResult && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono">
                  AI Status: {aiStatus === "answered" ? "✅ Responded" : "⏳ Thinking"}
                </span>
                <Button onClick={handleNextRound} className="bg-secondary hover:bg-secondary/90 text-background font-display font-bold uppercase tracking-wider text-xs">
                  {currentIndex < questions.length - 1 ? "Next Arena Clash" : "See Battle Verdict"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Phase 4: Results */}
        {phase === "results" && (
          <div className="text-center py-8 space-y-6">
            <Trophy className="w-16 h-16 text-secondary mx-auto mb-4 animate-bounce" />
            
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-extrabold text-foreground uppercase tracking-widest">
                {userScore > aiScore ? "🏆 Arena Victory!" : userScore === aiScore ? "🤝 Arena Draw" : "💥 Arena Defeat"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Final Score: you {userScore} - {aiScore} {selectedRival?.name}
              </p>
            </div>

            <div className="max-w-xs mx-auto p-4 rounded-xl bg-muted/50 border border-border font-mono text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span>Rival Challenged:</span>
                <span className="text-foreground">{selectedRival?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Quiz Accuracy:</span>
                <span className="text-foreground">{Math.round((userScore / 5) * 100)}%</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                <span>XP Earned:</span>
                <span className="text-accent">+{userScore > aiScore ? 50 : userScore === aiScore ? 25 : 10} XP</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Coins Awarded:</span>
                <span className="text-amber-400">+{userScore > aiScore ? 30 * selectedRival!.multiplier : userScore === aiScore ? 15 * selectedRival!.multiplier : 5} Coins</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" className="border-border text-foreground" onClick={onClose}>Close Arena</Button>
              <Button onClick={() => setPhase("select_rival")} className="bg-secondary hover:bg-secondary/95 text-background font-display font-semibold uppercase tracking-wider text-xs px-5">Play Again</Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
