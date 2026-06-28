import { useState, useEffect } from "react";
import { HelpCircle, Trophy, Clock, Sparkles, Loader2, Trash2, Swords, Users } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizDuelModal } from "@/components/student/QuizDuelModal";
import { ClassroomClashLobby } from "@/components/student/ClassroomClashLobby";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { QuizModal } from "@/components/student/QuizModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizAttempt {
  id: string;
  score: number | null;
  accuracy: number | null;
  xp_earned: number | null;
  completed_at: string | null;
  quiz: {
    title: string;
    difficulty_level: number | null;
  };
}

const ALLOWED_QUESTION_COUNTS = [3, 5, 10, 15] as const;
type AllowedQuestionCount = (typeof ALLOWED_QUESTION_COUNTS)[number];
const isAllowedQuestionCount = (value: number): value is AllowedQuestionCount =>
  (ALLOWED_QUESTION_COUNTS as readonly number[]).includes(value);

export default function StudentQuizzes() {
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicInput, setTopicInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showDuel, setShowDuel] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [questionCount, setQuestionCount] = useState<AllowedQuestionCount>(5);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  // Classroom Clash states
  const [classmates, setClassmates] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassmates, setSelectedClassmates] = useState<string[]>([]);
  const [scheduledClashes, setScheduledClashes] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Cadet");

  const [showClash, setShowClash] = useState(false);
  const [clashLobbyId, setClashLobbyId] = useState("");
  const [clashTopic, setClashTopic] = useState("");
  const [clashHost, setClashHost] = useState("");
  const [clashRole, setClashRole] = useState<"host" | "guest">("guest");

  useEffect(() => {
    fetchQuizAttempts();

    // Check query params for lobby invitation accepts
    const params = new URLSearchParams(window.location.search);
    const lobbyId = params.get("clashLobbyId");
    const topic = params.get("clashTopic");
    const host = params.get("clashHost");
    const role = params.get("role");

    if (lobbyId && topic && host) {
      setClashLobbyId(lobbyId);
      setClashTopic(topic);
      setClashHost(host);
      setClashRole(role === "host" ? "host" : "guest");
      setShowClash(true);

      // Clear search query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Real-time listener: watch for teacher_lobby_opened events and inject into list
  useEffect(() => {
    if (!classId) return;

    const channel = supabase.channel(`clashes_class_${classId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "teacher_lobby_opened" }, (payload) => {
        const data = payload.payload;
        // Add or update the clash in local list so student can see it immediately
        setScheduledClashes((prev) => {
          const exists = prev.find((c) => c.id === data.lobbyId);
          if (exists) {
            return prev.map((c) => c.id === data.lobbyId ? { ...c, status: "active" } : c);
          }
          return [
            ...prev,
            {
              id: data.lobbyId,
              topic: data.topic,
              status: "active",
              host_name: data.hostName,
              scheduled_at: new Date().toISOString(),
              class_id: classId
            }
          ];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const fetchQuizAttempts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!student) {
      setIsLoading(false);
      return;
    }

    setStudentId(student.id);
    setClassId(student.class_id);

    // Fetch profile name separately
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.full_name) setStudentName(profile.full_name);

    // Fetch classmates in their class
    if (student.class_id) {
      const { data: mates } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("class_id", student.class_id)
        .neq("id", student.id);
      
      if (mates && mates.length > 0) {
        const mateUserIds = mates.map((m: any) => m.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", mateUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        const formatted = mates.map((m: any) => ({
          id: m.id,
          name: profileMap.get(m.user_id) || "Unknown Cadet"
        }));
        setClassmates(formatted);
      } else {
        setClassmates([]);
      }

      // Fetch scheduled clashes
      try {
        const { data: scheduled, error: schedError } = await supabase
          .from("scheduled_clashes")
          .select("*")
          .eq("class_id", student.class_id)
          .neq("status", "completed")
          .order("scheduled_at", { ascending: true });
        
        if (schedError) {
          const local = JSON.parse(localStorage.getItem("local_scheduled_clashes") || "[]");
          const filtered = local.filter((c: any) => c.class_id === student.class_id && c.status !== "completed");
          setScheduledClashes(filtered);
        } else {
          setScheduledClashes(scheduled || []);
        }
      } catch (err) {
        console.warn("Could not load scheduled clashes", err);
      }
    }

    const { data } = await supabase
      .from("quiz_attempts")
      .select("*, quizzes(*)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        score: d.score,
        accuracy: d.accuracy,
        xp_earned: d.xp_earned,
        completed_at: d.completed_at,
        quiz: {
          title: d.quizzes?.title || "Unknown Quiz",
          difficulty_level: d.quizzes?.difficulty_level,
        },
      }));
      setQuizAttempts(formatted);
    }
    setIsLoading(false);
  };

  const handleHostP2PClash = async () => {
    if (!topicInput.trim()) {
      toast.error("Please enter a topic for the challenge");
      return;
    }
    if (selectedClassmates.length === 0) {
      toast.error("Please select at least one classmate to challenge");
      return;
    }

    const uniqueLobbyId = `lobby_${studentId}_${Date.now()}`;
    
    try {
      const channel = supabase.channel(`clashes_class_${classId}`);
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "clash_invite",
            payload: {
              lobbyId: uniqueLobbyId,
              topic: topicInput,
              hostName: studentName,
              hostId: studentId,
              invitedStudentIds: selectedClassmates
            }
          });
          
          toast.success("Challenges sent to peers! Entering cockpit lobby...");
          
          setClashLobbyId(uniqueLobbyId);
          setClashTopic(topicInput);
          setClashHost(studentName);
          setClashRole("host");
          setShowClash(true);
        }
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not broadcast lobby challenge.");
    }
  };

  const handleJoinTeacherClash = (clash: any) => {
    setClashLobbyId(clash.id);
    setClashTopic(clash.topic);
    setClashHost(clash.host_name || "Teacher");
    setClashRole("guest");
    setShowClash(true);
  };

  const toggleClassmateSelection = (id: string) => {
    setSelectedClassmates(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearQuizHistory = async () => {
    if (!studentId) {
      toast.error("Unable to find your student record");
      return;
    }

    setIsClearingHistory(true);
    const { error } = await supabase
      .from("quiz_attempts")
      .delete()
      .eq("student_id", studentId);

    if (error) {
      toast.error("Failed to clear quiz history");
      setIsClearingHistory(false);
      return;
    }

    setQuizAttempts([]);
    toast.success("Quiz history cleared");
    setIsClearingHistory(false);
  };

  const generateQuiz = async () => {
    if (!topicInput.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!isAllowedQuestionCount(questionCount)) {
      toast.error("Please select 3, 5, 10, or 15 questions");
      return;
    }

    setIsGenerating(true);
    setCurrentTopic(topicInput);

    setShowQuiz(true);
    setIsGenerating(false);
  };

  const getDifficultyLabel = (level: number | null) => {
    switch (level) {
      case 1: return { label: "Easy", color: "text-accent" };
      case 3: return { label: "Hard", color: "text-destructive" };
      default: return { label: "Medium", color: "text-secondary" };
    }
  };

  const totalXP = quizAttempts.reduce((sum, a) => sum + (a.xp_earned || 0), 0);
  const avgAccuracy = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0) / quizAttempts.length)
    : 0;

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Quizzes</h1>
          <p className="text-muted-foreground">Test your knowledge and earn XP</p>
        </div>

        <Card className="bg-gradient-card border-border shadow-[0_0_20px_rgba(139,92,246,0.08)]">
          <CardContent className="py-6">
            <Tabs defaultValue="standard" className="w-full">
              <TabsList className="grid grid-cols-3 bg-muted border border-border max-w-md mx-auto mb-6 animate-fade-in">
                <TabsTrigger value="standard" className="font-display text-sm gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Solo Training
                </TabsTrigger>
                <TabsTrigger value="duel" className="font-display text-sm gap-2">
                  <Swords className="w-4 h-4 text-secondary" />
                  Cosmic Arena
                </TabsTrigger>
                <TabsTrigger value="clash" className="font-display text-sm gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Classroom Clash ⚔️
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standard" className="space-y-1 mt-0">
                <h3 className="font-display text-lg mb-1 text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate AI Quiz
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter any topic and AI will create a personalized quiz for you to test your knowledge
                </p>
                <div className="flex gap-3">
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g., Photosynthesis, Newton's Laws, World War 2"
                    className="bg-muted border-border"
                    onKeyDown={(e) => e.key === "Enter" && generateQuiz()}
                  />

                  <div className="w-[160px]">
                    <Select
                      value={String(questionCount)}
                      onValueChange={(v) => {
                        const next = Number(v);
                        if (isAllowedQuestionCount(next)) setQuestionCount(next);
                      }}
                    >
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Questions" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_QUESTION_COUNTS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} questions
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={generateQuiz}
                    disabled={isGenerating || !topicInput.trim()}
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="duel" className="space-y-1 mt-0">
                <h3 className="font-display text-lg mb-1 text-foreground flex items-center gap-2">
                  <Swords className="w-5 h-5 text-secondary animate-pulse" />
                  Enter Cosmic Arena
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Challenge an AI rival in a timed quiz duel! Pay coin fees to challenge tougher enemies and win huge Cosmic Coin rewards!
                </p>
                <div className="flex gap-3">
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Enter arena duel topic (e.g. Gravity, Periodic Table)"
                    className="bg-muted border-border"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && topicInput.trim()) {
                        setCurrentTopic(topicInput);
                        setShowDuel(true);
                      }
                    }}
                  />

                  <Button
                    onClick={() => {
                      if (!topicInput.trim()) {
                        toast.error("Please enter a topic for the duel");
                        return;
                      }
                      setCurrentTopic(topicInput);
                      setShowDuel(true);
                    }}
                    disabled={!topicInput.trim()}
                    className="bg-secondary hover:bg-secondary/90 text-background font-display font-bold uppercase tracking-wider text-xs whitespace-nowrap px-6"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Enter Duel
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="clash" className="space-y-4 mt-0 animate-fade-in">
                {!classId ? (
                  <div className="text-center py-8 space-y-3">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h4 className="font-display font-semibold text-foreground text-sm">Join a Class for Classroom Clashes!</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Classroom Clashes are real-time, speed-weighted quiz battles played with your classmates or started by your teacher. Update your profile settings to link to a classroom!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
                    {/* P2P Challenge */}
                    <div className="space-y-3 md:border-r md:border-border/40 md:pr-6">
                      <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                        <Swords className="w-4 h-4 text-secondary" />
                        Private P2P Challenge
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Select specific classmates to challenge under timed, speed-weighted conditions.
                      </p>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">1. Enter Topic</label>
                        <Input
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder="e.g. Gravity, Fractions, Photosynthesis"
                          className="bg-muted border-border h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">2. Select Classmates to Challenge</label>
                        {classmates.length === 0 ? (
                          <p className="text-xs text-muted-foreground font-mono">No other classmates found in this class.</p>
                        ) : (
                          <div className="max-h-[140px] overflow-y-auto border border-border/80 rounded-lg p-2 bg-muted/30 space-y-1.5">
                            {classmates.map(mate => {
                              const isChecked = selectedClassmates.includes(mate.id);
                              return (
                                <button
                                  key={mate.id}
                                  type="button"
                                  onClick={() => toggleClassmateSelection(mate.id)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs font-mono transition-all duration-300",
                                    isChecked ? "bg-secondary/15 border border-secondary/35 text-secondary font-bold" : "hover:bg-muted border border-transparent text-muted-foreground"
                                  )}
                                >
                                  <div className={cn(
                                    "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] shrink-0",
                                    isChecked ? "border-secondary bg-secondary text-background" : "border-border"
                                  )}>
                                    {isChecked && "✓"}
                                  </div>
                                  <span className="truncate">{mate.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleHostP2PClash}
                        disabled={!topicInput.trim() || selectedClassmates.length === 0}
                        className="w-full bg-secondary hover:bg-secondary/95 text-background font-display font-semibold uppercase tracking-wider text-xs h-9 mt-2"
                      >
                        Challenge Crew ⚔️
                      </Button>
                    </div>

                    {/* Teacher Live & Scheduled Clashes */}
                    <div className="space-y-3">
                      <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-accent" />
                        Teacher-Led Clashes
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Participate in active live quiz sessions or see upcoming classes scheduled by your teacher.
                      </p>

                      <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                        {scheduledClashes.length === 0 ? (
                          <div className="text-center py-8 bg-muted/20 border border-dashed border-border rounded-lg">
                            <p className="text-xs text-muted-foreground font-mono">No teacher clashes scheduled currently.</p>
                          </div>
                        ) : (
                          scheduledClashes.map((clash) => {
                            const isActive = clash.status === "active";
                            return (
                              <div
                                key={clash.id}
                                className={cn(
                                  "p-3 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all duration-300",
                                  isActive ? "border-secondary bg-secondary/5 shadow-[0_0_15px_rgba(20,250,220,0.06)]" : "border-border bg-muted/20"
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-foreground font-mono">{clash.topic}</span>
                                    <span className={cn(
                                      "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                                      isActive ? "bg-green-500/20 text-green-400 animate-pulse border border-green-500/30" : "bg-slate-700/20 text-slate-400 border border-slate-700/30"
                                    )}>
                                      {isActive ? "Lobby Active" : "Scheduled"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    Time: {new Date(clash.scheduled_at).toLocaleString()}
                                  </p>
                                </div>
                                
                                {isActive ? (
                                  <Button
                                    size="sm"
                                    className="bg-secondary hover:bg-secondary/90 text-background font-display font-semibold uppercase tracking-wider text-[10px] h-8 px-4 w-full sm:w-auto"
                                    onClick={() => handleJoinTeacherClash(clash)}
                                  >
                                    Join Clash
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono italic">Waiting...</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalXP}</p>
                <p className="text-sm text-muted-foreground">Total XP from Quizzes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgAccuracy}%</p>
                <p className="text-sm text-muted-foreground">Average Accuracy</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Quiz History
            </CardTitle>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isLoading || quizAttempts.length === 0}
                  title="Delete your quiz attempt history"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear quiz history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your quiz attempts and may affect your stats and analytics.
                    This can’t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearingHistory}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearQuizHistory}
                    disabled={isClearingHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearingHistory ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Clearing...
                      </span>
                    ) : (
                      "Yes, clear"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : quizAttempts.length === 0 ? (
              <EmptyState
                title="No quizzes taken yet"
                message="Generate a quiz above to test your knowledge"
                icon={HelpCircle}
              />
            ) : (
              <div className="space-y-3">
                {quizAttempts.map((attempt) => {
                  const difficulty = getDifficultyLabel(attempt.quiz.difficulty_level);
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{attempt.quiz.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className={difficulty.color}>{difficulty.label}</span>
                          <span>•</span>
                          <span>{new Date(attempt.completed_at!).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{attempt.score}%</p>
                        <p className="text-sm text-accent">+{attempt.xp_earned} XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <QuizModal
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          topic={currentTopic}
          questionCount={questionCount}
          onCompleted={fetchQuizAttempts}
        />

        <QuizDuelModal
          isOpen={showDuel}
          onClose={() => setShowDuel(false)}
          topic={currentTopic}
          onCompleted={fetchQuizAttempts}
        />

        <ClassroomClashLobby
          isOpen={showClash}
          onClose={() => setShowClash(false)}
          topic={clashTopic}
          lobbyId={clashLobbyId}
          hostName={clashHost}
          role={clashRole}
          onCompleted={fetchQuizAttempts}
        />
      </div>
    </PortalLayout>
  );
}
