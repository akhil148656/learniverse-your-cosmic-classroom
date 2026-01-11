import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatsCard } from "@/components/cards/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Baby, Brain, Bell, Trophy, BookOpen, Target, Link2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChildData {
  id: string;
  name: string;
  xp_points: number;
  focus_score: number;
  grade_level: number | null;
  topics_completed: number;
  quizzes_passed: number;
  average_score: number;
}

interface FeedbackData {
  id: string;
  feedback_text: string;
  category: string | null;
  created_at: string;
  parent_acknowledged: boolean;
  student_name: string;
}

interface NotificationData {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: parentStudents } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", user.id);

    if (parentStudents && parentStudents.length > 0) {
      const studentIds = parentStudents.map((ps) => ps.student_id);
      const { data: students } = await supabase
        .from("students")
        .select("*, profiles!inner(full_name)")
        .in("id", studentIds);

      if (students) {
        const enrichedChildren = await Promise.all(
          students.map(async (s: any) => {
            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_passed, average_score")
              .eq("student_id", s.id);

            const totals = (analytics || []).reduce(
              (acc, a) => ({
                topics_completed: acc.topics_completed + (a.topics_completed || 0),
                quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                average_score: acc.average_score + (Number(a.average_score) || 0),
              }),
              { topics_completed: 0, quizzes_passed: 0, average_score: 0 }
            );

            return {
              id: s.id,
              name: s.profiles?.full_name || "Unknown",
              xp_points: s.xp_points || 0,
              focus_score: s.focus_score || 100,
              grade_level: s.grade_level,
              topics_completed: totals.topics_completed,
              quizzes_passed: totals.quizzes_passed,
              average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
            };
          })
        );
        setChildren(enrichedChildren);
      }
    }
    setIsLoading(false);
  };

  // Note: In a real app, you'd have a proper linking mechanism. This is simplified.
  const linkChild = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter a student code");
      return;
    }
    setIsLinking(true);
    // This would need a proper implementation with student codes
    toast.info("Student linking feature requires additional setup");
    setIsLinking(false);
  };

  const totalXP = children.reduce((sum, c) => sum + c.xp_points, 0);
  const avgFocus = children.length > 0 
    ? Math.round(children.reduce((sum, c) => sum + c.focus_score, 0) / children.length) 
    : 0;

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Track your child's learning progress</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : children.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8">
              <EmptyState
                title="No linked children"
                message="Link your child's account to track their progress"
                icon={Link2}
              />
              <div className="flex gap-3 mt-6 max-w-md mx-auto">
                <Input
                  placeholder="Enter student code"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  className="bg-muted border-border"
                />
                <Button onClick={linkChild} disabled={isLinking} className="bg-primary hover:bg-primary/90">
                  {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Children" value={children.length} icon={Baby} variant="primary" />
              <StatsCard title="Total XP" value={totalXP} icon={Trophy} variant="accent" />
              <StatsCard title="Avg Focus" value={`${avgFocus}%`} icon={Brain} variant="secondary" />
              <StatsCard title="Topics" value={children.reduce((s, c) => s + c.topics_completed, 0)} icon={BookOpen} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Card key={child.id} className="bg-card border-border hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="font-display text-lg text-foreground">{child.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Grade {child.grade_level || "N/A"}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">XP Points</p>
                        <p className="text-lg font-bold text-accent">{child.xp_points}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quizzes Passed</p>
                        <p className="text-lg font-bold text-foreground">{child.quizzes_passed}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Focus Score</span>
                        <span className="text-foreground">{child.focus_score}%</span>
                      </div>
                      <Progress value={child.focus_score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}

export function ParentChildProgress() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: parentStudents } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (parentStudents && parentStudents.length > 0) {
        const studentIds = parentStudents.map((ps) => ps.student_id);
        const { data: students } = await supabase
          .from("students")
          .select("*, profiles!inner(full_name)")
          .in("id", studentIds);

        if (students) {
          const enrichedChildren = await Promise.all(
            students.map(async (s: any) => {
              const { data: analytics } = await supabase
                .from("student_analytics")
                .select("*")
                .eq("student_id", s.id);

              const totals = (analytics || []).reduce(
                (acc, a) => ({
                  topics_completed: acc.topics_completed + (a.topics_completed || 0),
                  quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                  average_score: acc.average_score + (Number(a.average_score) || 0),
                }),
                { topics_completed: 0, quizzes_passed: 0, average_score: 0 }
              );

              return {
                id: s.id,
                name: s.profiles?.full_name || "Unknown",
                xp_points: s.xp_points || 0,
                focus_score: s.focus_score || 100,
                grade_level: s.grade_level,
                topics_completed: totals.topics_completed,
                quizzes_passed: totals.quizzes_passed,
                average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
              };
            })
          );
          setChildren(enrichedChildren);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Child Progress</h1>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : children.length === 0 ? (
          <EmptyState title="No linked children" message="Link your child's account to see their progress" icon={Baby} />
        ) : (
          <div className="space-y-6">
            {children.map((child) => (
              <Card key={child.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-foreground">{child.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold text-foreground">{child.xp_points}</p>
                      <p className="text-sm text-muted-foreground">XP Points</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Brain className="w-8 h-8 mx-auto mb-2 text-secondary" />
                      <p className="text-2xl font-bold text-foreground">{child.focus_score}%</p>
                      <p className="text-sm text-muted-foreground">Focus Score</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold text-foreground">{child.topics_completed}</p>
                      <p className="text-sm text-muted-foreground">Topics</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Target className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold text-foreground">{child.quizzes_passed}</p>
                      <p className="text-sm text-muted-foreground">Quizzes Passed</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Performance Overview</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Quiz Score</span>
                        <span className="text-foreground">{child.average_score}%</span>
                      </div>
                      <Progress value={child.average_score} className="h-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

export function ParentAIFeedback() {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: parentStudents } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (parentStudents && parentStudents.length > 0) {
        const studentIds = parentStudents.map((ps) => ps.student_id);
        
        const { data: students } = await supabase
          .from("students")
          .select("id, profiles!inner(full_name)")
          .in("id", studentIds);

        const { data: feedbackData } = await supabase
          .from("ai_feedback")
          .select("*")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false });

        if (feedbackData) {
          const enriched = feedbackData.map((f) => ({
            ...f,
            student_name: (students?.find((s: any) => s.id === f.student_id) as any)?.profiles?.full_name || "Unknown",
          }));
          setFeedback(enriched);
        }
      }
      setIsLoading(false);
    };
    fetchFeedback();
  }, []);

  const acknowledgeFeedback = async (feedbackId: string) => {
    const { error } = await supabase
      .from("ai_feedback")
      .update({ parent_acknowledged: true })
      .eq("id", feedbackId);

    if (!error) {
      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, parent_acknowledged: true } : f))
      );
      toast.success("Feedback acknowledged");
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "achievement": return "bg-accent/20 text-accent";
      case "improvement": return "bg-destructive/20 text-destructive";
      case "focus": return "bg-secondary/20 text-secondary";
      default: return "bg-primary/20 text-primary";
    }
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">AI Feedback</h1>
        <p className="text-muted-foreground">AI-generated insights about your child's learning</p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : feedback.length === 0 ? (
          <EmptyState title="No feedback yet" message="AI-generated insights will appear here" icon={Brain} />
        ) : (
          <div className="space-y-4">
            {feedback.map((f) => (
              <Card key={f.id} className={`bg-card border-border ${!f.parent_acknowledged ? "border-l-4 border-l-primary" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="font-display text-lg text-foreground">{f.student_name}</CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(f.category)}`}>
                        {f.category || "progress"}
                      </span>
                    </div>
                    {!f.parent_acknowledged && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeFeedback(f.id)} className="gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap">
                    {f.feedback_text}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

export function ParentAlerts() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
      setIsLoading(false);
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "warning": return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "success": return <CheckCircle className="w-5 h-5 text-accent" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted-foreground">Important notifications about your child's learning</p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No alerts" message="Important notifications will appear here" icon={Bell} />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`bg-card border-border cursor-pointer transition-colors hover:border-primary ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => markAsRead(n.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {getTypeIcon(n.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      )}
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
