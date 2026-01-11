import { useState, useEffect } from "react";
import { HelpCircle, Trophy, Clock, Sparkles, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/cards/EmptyState";
import { QuizModal } from "@/components/student/QuizModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function StudentQuizzes() {
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicInput, setTopicInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");

  useEffect(() => {
    fetchQuizAttempts();
  }, []);

  const fetchQuizAttempts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      setIsLoading(false);
      return;
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

  const generateQuiz = async () => {
    if (!topicInput.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    setCurrentTopic(topicInput);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          topic: topicInput,
          difficulty: "medium",
          questionCount: 5,
          gradeLevel: 10,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      setShowQuiz(true);
      toast.success("Quiz generated! Let's test your knowledge.");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
    }
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

        <Card className="bg-gradient-card border-border">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <h3 className="font-display text-lg mb-2 text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate AI Quiz
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter any topic and AI will create a personalized quiz for you
                </p>
                <div className="flex gap-3">
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g., Photosynthesis, Newton's Laws, World War 2"
                    className="bg-muted border-border"
                    onKeyDown={(e) => e.key === "Enter" && generateQuiz()}
                  />
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
              </div>
            </div>
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
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Quiz History
            </CardTitle>
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

        <QuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} topic={currentTopic} />
      </div>
    </PortalLayout>
  );
}
