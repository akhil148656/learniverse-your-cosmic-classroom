import { useState, useEffect } from "react";
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
  explanation: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
}

export function QuizModal({ isOpen, onClose, topic }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const generateQuiz = async () => {
    if (!topic) return;
    
    setIsLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setQuizComplete(false);

    try {
      const { data, error } = await supabase.functions.invoke("ai-mentor", {
        body: {
          messages: [{ role: "user", content: `Generate a quiz about: ${topic}` }],
          type: "quiz",
        },
      });

      if (error) throw error;

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No quiz content received");

      // Parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid quiz format");

      const parsedQuestions = JSON.parse(jsonMatch[0]);
      setQuestions(parsedQuestions);
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast.error("Failed to generate quiz");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && topic) {
      generateQuiz();
    }
  }, [isOpen, topic]);

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === questions[currentIndex].correct) {
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
