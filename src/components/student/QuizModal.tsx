import { useState, useEffect, useRef } from "react";
import { HelpCircle, CheckCircle2, XCircle, Loader2, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  points?: number;
  explanation: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  topic: string;
  questionCount?: number;
}
const GENERATE_QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

const ALLOWED_QUESTION_COUNTS = [3, 5, 10, 15] as const;
type AllowedQuestionCount = (typeof ALLOWED_QUESTION_COUNTS)[number];
const isAllowedQuestionCount = (value: number): value is AllowedQuestionCount =>
  (ALLOWED_QUESTION_COUNTS as readonly number[]).includes(value);

function computeQuizMetrics(questions: QuizQuestion[], correctCount: number) {
  const totalQuestions = questions.length || 0;
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 10), 0) || (totalQuestions * 10);
  // We don't currently track per-question correctness history; fall back to proportional points.
  const avgPoints = totalQuestions > 0 ? (totalPoints / totalQuestions) : 10;
  const earnedPoints = Math.round(correctCount * avgPoints);

  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const accuracy = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

  return {
    totalQuestions,
    totalPoints,
    earnedPoints,
    scorePercent,
    accuracy,
    xpEarned: earnedPoints,
  };
}

export function QuizModal({ isOpen, onClose, topic, onCompleted, questionCount }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [completionDiagnostics, setCompletionDiagnostics] = useState<{
    scorePercent: number;
    xpEarned: number;
    newXp: number;
    level: number;
    provider: string | null;
    model: string | null;
  } | null>(null);
  const quizStartedAtRef = useRef<number | null>(null);
  const attemptSavedRef = useRef(false);
  const correctCountRef = useRef(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const getStudentId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Not signed in");

    const { data: student, error } = await supabase
      .from("students")
      .select("id, xp_points, grade_level")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    if (!student?.id) throw new Error("Student record not found");
    return {
      studentId: student.id as string,
      currentXp: Number(student.xp_points) || 0,
      gradeLevel: Number(student.grade_level) || null,
    };
  };

  const ensureStudentAnalyticsRow = async (studentId: string) => {
    const { data: rows } = await supabase
      .from("student_analytics")
      .select("id, quizzes_attempted, quizzes_passed, total_marks, average_score, study_time_minutes")
      .eq("student_id", studentId)
      .is("subject_id", null)
      .order("created_at", { ascending: true })
      .limit(1);

    if (rows && rows.length > 0) return rows[0];

    const { data: created, error } = await supabase
      .from("student_analytics")
      .insert({
        student_id: studentId,
        subject_id: null,
        topics_completed: 0,
        quizzes_attempted: 0,
        quizzes_passed: 0,
        total_marks: 0,
        average_score: 0,
        study_time_minutes: 0,
        last_activity_at: new Date().toISOString(),
      })
      .select("id, quizzes_attempted, quizzes_passed, total_marks, average_score, study_time_minutes")
      .single();

    if (error) throw error;
    return created;
  };

  const saveQuizAttempt = async (correctCount: number) => {
    if (!quizId) return;
    if (attemptSavedRef.current) return;
    attemptSavedRef.current = true;

    const { studentId, currentXp } = await getStudentId();
    const startedAt = quizStartedAtRef.current ?? Date.now();
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const metrics = computeQuizMetrics(questions, correctCount);

    const completedAt = new Date().toISOString();

    const { error: attemptError } = await supabase.from("quiz_attempts").insert({
      quiz_id: quizId,
      student_id: studentId,
      mode: "ai",
      score: metrics.scorePercent,
      accuracy: metrics.accuracy,
      time_taken_seconds: timeTakenSeconds,
      xp_earned: metrics.xpEarned,
      completed_at: completedAt,
    });

    if (attemptError) throw attemptError;

    // Update student XP
    const newXp = currentXp + metrics.xpEarned;
    await supabase.from("students").update({ xp_points: newXp }).eq("id", studentId);

    // Update analytics (single global row with subject_id = null)
    const analytics = await ensureStudentAnalyticsRow(studentId);
    const prevAttempted = Number((analytics as any)?.quizzes_attempted) || 0;
    const prevPassed = Number((analytics as any)?.quizzes_passed) || 0;
    const prevTotalMarks = Number((analytics as any)?.total_marks) || 0;
    const prevAvg = Number((analytics as any)?.average_score) || 0;
    const prevStudyMinutes = Number((analytics as any)?.study_time_minutes) || 0;

    const newAttempted = prevAttempted + 1;
    const passedThis = metrics.scorePercent >= 60 ? 1 : 0;
    const newPassed = prevPassed + passedThis;
    const newTotalMarks = prevTotalMarks + metrics.scorePercent;
    const newAvg = Number((((prevAvg * prevAttempted) + metrics.scorePercent) / newAttempted).toFixed(2));
    const addedStudyMinutes = Math.max(1, Math.ceil(timeTakenSeconds / 60));
    const newStudyMinutes = prevStudyMinutes + addedStudyMinutes;

    await supabase
      .from("student_analytics")
      .update({
        quizzes_attempted: newAttempted,
        quizzes_passed: newPassed,
        total_marks: newTotalMarks,
        average_score: newAvg,
        study_time_minutes: newStudyMinutes,
        last_activity_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", (analytics as any).id);

    // Derive a simple level from XP (100 XP per level).
    const level = Math.floor(newXp / 100) + 1;
    const diag = {
      scorePercent: metrics.scorePercent,
      xpEarned: metrics.xpEarned,
      newXp,
      level,
      provider: aiProvider,
      model: aiModel,
    };
    setCompletionDiagnostics(diag);
    console.log("Quiz completion diagnostics:", diag);

    onCompleted?.();
  };

  const generateQuiz = async () => {
    if (!topic) return;

    const requestedCount = Number(questionCount);
    const count: AllowedQuestionCount =
      Number.isFinite(requestedCount) && isAllowedQuestionCount(requestedCount)
        ? requestedCount
        : 5;

    setIsLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setQuizId(null);
    setAiProvider(null);
    setAiModel(null);
    setCompletionDiagnostics(null);
    attemptSavedRef.current = false;
    quizStartedAtRef.current = null;
    setQuizComplete(false);
    correctCountRef.current = 0;

    try {
      // Send studentId so the backend can adapt difficulty and avoid repeating questions.
      const { studentId, gradeLevel } = await getStudentId();

      const resp = await fetch(GENERATE_QUIZ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          topic,
          difficulty: "auto",
          questionCount: count,
          gradeLevel: gradeLevel ?? 10,
          studentId,
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        throw new Error(errorText || `Failed to generate quiz (HTTP ${resp.status})`);
      }

      const data = await resp.json();
      const parsedQuestions = data?.questions as QuizQuestion[] | undefined;
      const createdQuizId = data?.quizId as string | undefined;
      const provider = typeof data?.provider === "string" ? (data.provider as string) : null;
      const model = typeof data?.model === "string" ? (data.model as string) : null;

      if (!createdQuizId) throw new Error("Quiz ID missing from backend response");
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) throw new Error("No quiz questions received");

      setQuizId(createdQuizId);
      setQuestions(parsedQuestions);
      setAiProvider(provider);
      setAiModel(model);
      quizStartedAtRef.current = Date.now();
    } catch (error) {
      console.error("Quiz generation error:", error);
      const raw =
        typeof (error as any)?.message === "string"
          ? String((error as any).message)
          : typeof (error as any)?.toString === "function"
            ? String((error as any).toString())
            : "";

      if (/models\/gemini-1\.5-flash\s+is\s+not\s+found/i.test(raw)) {
        toast.error(
          "AI model not found. In Supabase Edge Function env vars, set GEMINI_MODEL=gemini-1.5-flash-001 (or remove GEMINI_MODEL). "
        );
      } else if (/GEMINI_API_KEY/i.test(raw)) {
        toast.error("AI not configured. Add GEMINI_API_KEY in Supabase Edge Function secrets.");
      } else if (/SUPABASE_SERVICE_ROLE_KEY|service role/i.test(raw)) {
        toast.error("Backend missing SUPABASE_SERVICE_ROLE_KEY for quiz generation.");
      } else {
        toast.error("Failed to generate quiz");
      }

      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && topic) {
      generateQuiz();
    }
  }, [isOpen, topic, questionCount]);

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === questions[currentIndex].correct) {
      correctCountRef.current += 1;
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
      // Persist attempt once at completion.
      saveQuizAttempt(correctCountRef.current).catch((e) => {
        console.error("Failed to save quiz attempt:", e);
        toast.error("Quiz completed, but failed to save score.");
      });
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Quiz: {topic}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating quiz questions...</p>
          </div>
        ) : quizComplete ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Quiz Complete!</h3>
            <p className="text-muted-foreground mb-4">
              You scored {score} out of {questions.length}
            </p>
            {completionDiagnostics ? (
              <div className="text-sm text-muted-foreground mb-6 space-y-1">
                <div>Score: {completionDiagnostics.scorePercent}%</div>
                <div>+{completionDiagnostics.xpEarned} XP (Total: {completionDiagnostics.newXp} XP)</div>
                <div>Level: {completionDiagnostics.level}</div>
                {completionDiagnostics.provider ? (
                  <div>
                    AI: {completionDiagnostics.provider}
                    {completionDiagnostics.model ? ` (${completionDiagnostics.model})` : ""}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={generateQuiz} className="bg-primary hover:bg-primary/90">Try Again</Button>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>Score: {score}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6">
                <p className="text-lg font-medium text-foreground mb-6">{currentQuestion.question}</p>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={`w-full justify-start text-left h-auto py-3 px-4 ${
                        showResult
                          ? index === currentQuestion.correct
                            ? "border-green-500 bg-green-500/10 text-green-500"
                            : index === selectedAnswer
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border"
                          : selectedAnswer === index
                            ? "border-primary"
                            : "border-border hover:border-primary"
                      }`}
                      onClick={() => handleAnswer(index)}
                      disabled={showResult}
                    >
                      <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
                      {option}
                      {showResult && index === currentQuestion.correct && (
                        <CheckCircle2 className="ml-auto w-5 h-5 text-green-500" />
                      )}
                      {showResult && index === selectedAnswer && index !== currentQuestion.correct && (
                        <XCircle className="ml-auto w-5 h-5 text-destructive" />
                      )}
                    </Button>
                  ))}
                </div>

                {showResult && (
                  <div className="mt-4 p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {showResult && (
              <div className="flex justify-end">
                <Button onClick={nextQuestion} className="bg-primary hover:bg-primary/90">
                  {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
