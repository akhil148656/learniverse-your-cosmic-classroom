import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Trophy, Target, Brain, Zap, Clock, FlaskConical, FileText } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { StatsCard } from "@/components/cards/StatsCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData } = await supabase.from("students").select("*").eq("user_id", user.id).single();
      if (studentData) {
        setStudent(studentData);
        const { data: analyticsData } = await supabase.from("student_analytics").select("*").eq("student_id", studentData.id);
        setAnalytics(analyticsData || []);
        const { data: suggestionsData } = await supabase.from("learning_suggestions").select("*, topics(name)").eq("student_id", studentData.id).eq("is_dismissed", false).limit(5);
        setSuggestions(suggestionsData || []);
        const { data: assignmentsData } = await supabase.from("student_assignments").select("*, assignments(title, due_date)").eq("student_id", studentData.id).eq("status", "pending").limit(5);
        setAssignments(assignmentsData || []);
      }
    };
    fetchData();
  }, []);

  const totalXP = student?.xp_points || 0;
  const focusScore = student?.focus_score || 100;
  const totalTopics = analytics.reduce((sum, a) => sum + (a.topics_completed || 0), 0);
  const quizzesPassed = analytics.reduce((sum, a) => sum + (a.quizzes_passed || 0), 0);

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Continue your learning journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total XP" value={totalXP} icon={Trophy} variant="primary" />
          <StatsCard title="Focus Score" value={`${focusScore}%`} icon={Brain} variant="secondary" />
          <StatsCard title="Topics Completed" value={totalTopics} icon={BookOpen} variant="accent" />
          <StatsCard title="Quizzes Passed" value={quizzesPassed} icon={Target} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Smart Learning Suggestions</CardTitle>
              <Zap className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <Button key={s.id} variant="outline" className="w-full justify-start gap-3 h-auto py-3 bg-muted/50 border-border hover:border-primary" onClick={() => navigate(`/student/search?topic=${s.topic_id}`)}>
                      <BookOpen className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{s.topics?.name || "Topic"}</p>
                        <p className="text-sm text-muted-foreground">{s.suggestion_text}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No suggestions yet" message="AI suggestions will appear based on your learning" icon={Brain} />
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Pending Tasks</CardTitle>
              <FileText className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <Button key={a.id} variant="outline" className="w-full justify-start gap-3 h-auto py-3 bg-muted/50 border-border hover:border-accent" onClick={() => navigate(`/student/assignments`)}>
                      <Clock className="w-5 h-5 text-accent" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{a.assignments?.title}</p>
                        <p className="text-sm text-muted-foreground">Due: {a.assignments?.due_date ? new Date(a.assignments.due_date).toLocaleDateString() : "No deadline"}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No pending tasks" message="You're all caught up!" icon={FileText} />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Virtual Labs</CardTitle>
            <FlaskConical className="w-5 h-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["Physics", "Chemistry", "Biology", "Geography"].map((lab) => (
                <Button key={lab} variant="outline" className="h-24 flex flex-col gap-2 bg-gradient-card border-border hover:border-secondary" onClick={() => navigate("/student/virtual-labs")}>
                  <FlaskConical className="w-6 h-6 text-secondary" />
                  <span className="font-display text-sm">{lab}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
