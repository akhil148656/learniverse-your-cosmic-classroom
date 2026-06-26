import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Trophy, Target, Brain, Zap, Clock, FlaskConical, FileText, Users, GraduationCap, Copy, CheckCircle, MessageSquare } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { StatsCard } from "@/components/cards/StatsCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GamificationPanel } from "@/components/student/GamificationPanel";

interface ClassInfo {
  id: string;
  name: string;
  description: string | null;
  grade_level: number | null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [latestApprovedFeedback, setLatestApprovedFeedback] = useState<{ text: string; createdAt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [studentName, setStudentName] = useState("Student");

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
        if (!user) {
          navigate("/student-login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setStudentName(profile?.full_name || "Student");

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError) {
        toast.error(studentError.message || "Could not load student profile");
        return;
      }

      if (!studentData) {
        toast.error("Could not find your profile");
        return;
      }

      setStudent(studentData);

      if (studentData.class_id) {
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, name, description, grade_level")
          .eq("id", studentData.class_id)
          .single();

        if (classError) {
          setClassInfo(null);
        } else {
          setClassInfo(classData);
        }
      } else {
        setClassInfo(null);
      }

      const { data: analyticsData } = await supabase.from("student_analytics").select("*").eq("student_id", studentData.id);
      setAnalytics(analyticsData || []);

      const { data: suggestionsData } = await supabase
        .from("learning_suggestions")
        .select("*, topics(name)")
        .eq("student_id", studentData.id)
        .eq("is_dismissed", false)
        .limit(5);
      setSuggestions(suggestionsData || []);

      const { data: assignmentsData } = studentData.class_id
        ? await supabase
            .from("student_assignments")
            .select("*, assignments!inner(title, due_date, class_id)")
            .eq("student_id", studentData.id)
            .eq("status", "pending")
            .eq("assignments.class_id", studentData.class_id)
            .order("due_date", { ascending: true, foreignTable: "assignments" })
            .limit(6)
        : { data: [] as any[] };
      setAssignments(assignmentsData || []);

      const { data: feedbackRow, error: feedbackError } = await supabase
        .from("ai_feedback")
        .select("feedback_text, created_at")
        .eq("student_id", studentData.id)
        .eq("teacher_acknowledged", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (feedbackError) {
        // Likely missing RLS policy or migrations; keep quiet but allow the rest of the dashboard.
        console.warn("StudentDashboard: failed to load ai_feedback", feedbackError);
        setLatestApprovedFeedback(null);
      } else if (feedbackRow?.feedback_text) {
        setLatestApprovedFeedback({ text: feedbackRow.feedback_text, createdAt: feedbackRow.created_at });
      } else {
        setLatestApprovedFeedback(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStudentData();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void fetchStudentData();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchStudentData();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const totalXP = student?.xp_points || 0;
  const focusScore = student?.focus_score || 100;
  const totalTopics = analytics.reduce((sum, a) => sum + (a.topics_completed || 0), 0);
  const quizzesPassed = analytics.reduce((sum, a) => sum + (a.quizzes_passed || 0), 0);

  const copyStudentCode = async () => {
    const code = String(student?.student_code || "").trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success("Student code copied");
    } catch {
      toast.error("Could not copy student code");
    }
  };

  const handleLeaveClass = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        return;
      }

      const { error } = await supabase
        .from("students")
        .update({ class_id: null, learning_mode: "individual" })
        .eq("user_id", user.id);

      if (error) {
        toast.error(error.message || "Failed to leave class");
        return;
      }

      toast.success("Left class");
      await fetchStudentData();
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <GamificationPanel />
        
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Welcome back!</h1>
                <p className="text-muted-foreground">Continue your learning journey</p>
              </div>
              <Button variant="outline" onClick={() => navigate("/student/settings")}>
                Profile
              </Button>
            </div>

            {student?.student_code ? (
              <Card>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Your Student ID</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-semibold tracking-[0.4em]">{student.student_code}</span>
                      <Button variant="outline" size="sm" className="h-9 px-3" onClick={copyStudentCode}>
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-2 text-xs uppercase tracking-[0.2em]">{copied ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            {classInfo ? (
              <Card>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Class</p>
                      <p className="font-display font-semibold text-foreground">{classInfo.name}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        Grade {classInfo.grade_level ?? "—"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate("/student/assignments")}>
                      View assignments
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLeaveClass} disabled={isLeaving}>
                      {isLeaving ? "Leaving..." : "Leave class"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : student?.learning_mode === "individual" ? (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <GraduationCap className="w-8 h-8 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Mode</p>
                    <p className="font-display font-semibold text-foreground">Individual Learning</p>
                    <Button variant="link" className="text-sm p-0" onClick={() => navigate("/student/onboarding")}>Join a class instead</Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total XP" value={totalXP} icon={Trophy} variant="primary" />
          <StatsCard title="Focus Score" value={`${focusScore}%`} icon={Brain} variant="secondary" />
          <StatsCard title="Topics Completed" value={totalTopics} icon={BookOpen} variant="accent" />
          <StatsCard title="Quizzes Passed" value={quizzesPassed} icon={Target} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all duration-300 hover:border-primary/30 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Smart Learning Suggestions</CardTitle>
              <Zap className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion.id}
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => navigate(`/student/search?topic=${suggestion.topics?.name || ""}`)}
                    >
                      <BookOpen className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{suggestion.topics?.name || "Topic"}</p>
                        <p className="text-sm text-muted-foreground">{suggestion.suggestion_text}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading suggestions" : "No suggestions yet"}
                  message={isLoading ? "Curating personalized prompts" : "AI suggestions will appear based on your learning"}
                  icon={Brain}
                />
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel hover:shadow-[0_0_25px_rgba(20,250,220,0.15)] transition-all duration-300 hover:border-secondary/30 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Latest AI Feedback</CardTitle>
              <MessageSquare className="w-5 h-5 text-secondary" />
            </CardHeader>
            <CardContent>
              {latestApprovedFeedback?.text ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestApprovedFeedback.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Approved: {new Date(latestApprovedFeedback.createdAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading feedback" : "No approved feedback yet"}
                  message={isLoading ? "Checking for teacher-approved feedback" : "Your teacher-approved feedback will appear here."}
                  icon={Brain}
                />
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel hover:shadow-[0_0_25px_rgba(236,72,153,0.15)] transition-all duration-300 hover:border-accent/30 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Pending Tasks</CardTitle>
              <FileText className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <Button
                      key={assignment.id}
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => navigate(`/student/assignments`)}
                    >
                      <Clock className="w-5 h-5 text-accent" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{assignment.assignments?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {assignment.assignments?.due_date ? new Date(assignment.assignments.due_date).toLocaleDateString() : "No deadline"}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isLoading ? "Loading assignments" : "No pending tasks"}
                  message={isLoading ? "Gathering your tasks" : "You're all caught up!"}
                  icon={FileText}
                />
              )}
            </CardContent>
          </Card>
        </div>
        {/* Virtual Labs section removed to save space */}
      </div>
    </PortalLayout>
  );
}
