import { useState, useEffect } from "react";
import { BarChart3, Users, Trophy, Brain, BookOpen, Target, TrendingUp } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/cards/StatsCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface ClassData {
  id: string;
  name: string;
}

interface ClassAnalytics {
  totalStudents: number;
  avgXP: number;
  avgFocusScore: number;
  totalTopicsCompleted: number;
  totalQuizzesPassed: number;
  avgScore: number;
  topPerformers: { name: string; xp: number }[];
  needsAttention: { name: string; focusScore: number }[];
}

export default function TeacherAnalytics() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user.id);
      setClasses(data || []);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Do NOT join `students -> profiles` via PostgREST.
      // There is no FK relationship between these tables (both reference auth.users via user_id),
      // so a relationship join can fail with: "Could not find a relationship... in the schema cache".
      let studentsQuery = supabase.from("students").select("id, user_id, class_id, xp_points, focus_score");

      if (selectedClass !== "all") {
        studentsQuery = studentsQuery.eq("class_id", selectedClass);
      } else {
        const classIds = classes.map((c) => c.id);
        if (classIds.length > 0) {
          studentsQuery = studentsQuery.in("class_id", classIds);
        }
      }

      const { data: students, error: studentsError } = await studentsQuery;

      if (studentsError) {
        console.error("Failed to load students for analytics", studentsError);
        setAnalytics(null);
        setIsLoading(false);
        return;
      }

      if (!students || students.length === 0) {
        setAnalytics(null);
        setIsLoading(false);
        return;
      }

      const userIds = Array.from(new Set((students || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [], error: null };

      if (profilesError) {
        // Names are non-critical; analytics can still show.
        console.warn("Could not load student profiles (names)", profilesError);
      }

      const nameByUserId = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        if (p?.user_id) nameByUserId.set(p.user_id, p.full_name || "Unknown");
      });

      // Calculate analytics
      const totalStudents = students.length;
      const avgXP = Math.round(students.reduce((sum, s) => sum + (s.xp_points || 0), 0) / totalStudents);
      const avgFocusScore = Math.round(students.reduce((sum, s) => sum + (s.focus_score || 100), 0) / totalStudents);

      // Get analytics data
      const studentIds = students.map((s) => s.id);
      const { data: analyticsData } = await supabase
        .from("student_analytics")
        .select("*")
        .in("student_id", studentIds);

      const totalTopicsCompleted = analyticsData?.reduce((sum, a) => sum + (a.topics_completed || 0), 0) || 0;
      const totalQuizzesPassed = analyticsData?.reduce((sum, a) => sum + (a.quizzes_passed || 0), 0) || 0;
      const avgScore = analyticsData && analyticsData.length > 0
        ? Math.round(analyticsData.reduce((sum, a) => sum + (Number(a.average_score) || 0), 0) / analyticsData.length)
        : 0;

      // Top performers
      const topPerformers = students
        .sort((a, b) => (b.xp_points || 0) - (a.xp_points || 0))
        .slice(0, 5)
        .map((s: any) => ({ name: nameByUserId.get(s.user_id) || "Unknown", xp: s.xp_points || 0 }));

      // Needs attention (low focus score)
      const needsAttention = students
        .filter((s) => (s.focus_score || 100) < 70)
        .slice(0, 5)
        .map((s: any) => ({ name: nameByUserId.get(s.user_id) || "Unknown", focusScore: s.focus_score || 0 }));

      setAnalytics({
        totalStudents,
        avgXP,
        avgFocusScore,
        totalTopicsCompleted,
        totalQuizzesPassed,
        avgScore,
        topPerformers,
        needsAttention,
      });
      setIsLoading(false);
    };

    if (classes.length > 0 || selectedClass === "all") {
      fetchAnalytics();
    }
  }, [selectedClass, classes]);

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Track student performance and progress</p>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px] bg-muted border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : !analytics ? (
          <EmptyState
            title="No data yet"
            message="Student analytics will appear once students join your classes"
            icon={BarChart3}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Students" value={analytics.totalStudents} icon={Users} variant="primary" />
              <StatsCard title="Average XP" value={analytics.avgXP} icon={Trophy} variant="accent" />
              <StatsCard title="Avg Focus Score" value={`${analytics.avgFocusScore}%`} icon={Brain} variant="secondary" />
              <StatsCard title="Avg Quiz Score" value={`${analytics.avgScore}%`} icon={Target} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title="Topics Completed" value={analytics.totalTopicsCompleted} icon={BookOpen} />
              <StatsCard title="Quizzes Passed" value={analytics.totalQuizzesPassed} icon={TrendingUp} variant="accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.topPerformers.length > 0 ? (
                    analytics.topPerformers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                            {i + 1}
                          </span>
                          <span className="font-medium text-foreground">{s.name}</span>
                        </div>
                        <span className="text-accent font-medium">{s.xp} XP</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-destructive" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.needsAttention.length > 0 ? (
                    analytics.needsAttention.map((s, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{s.name}</span>
                          <span className="text-destructive font-medium">{s.focusScore}%</span>
                        </div>
                        <Progress value={s.focusScore} className="h-2" />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">All students performing well! 🎉</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
