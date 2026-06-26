import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, Users, FileText, BarChart3, MessageSquare, ArrowRight, Clock, Copy, Plus } from "lucide-react";
import NotesAgent from "@/components/NotesAgent";
import { supabase } from "@/integrations/supabase/client";
import { RadialProgress } from "@/components/ui/radial-progress";
import { toast } from "sonner";

export function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    assignmentsCompletionPercent: 0,
    assignmentsCompleted: 0,
    assignmentsTotal: 0,
    studentsLearningToday: 0,
    studentsQuizToday: 0,
    totalStudents: 0,
  });

  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name, class_code, grade_level")
        .order("created_at", { ascending: false });

      if (classesError) throw classesError;
      const activeClasses = classesData || [];
      setClasses(activeClasses);
      const classIds = activeClasses.map((c: any) => c.id);

      // 2. Fetch Students
      const { data: students, error: studentsError } = classIds.length
        ? await supabase.from("students").select("id").in("class_id", classIds)
        : { data: [] as any[], error: null };

      if (studentsError) throw studentsError;
      const studentIds = (students || []).map((s: any) => s.id);

      // 3. Fetch Assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title, due_date, class_id")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      const activeAssignments = assignmentsData || [];
      setAssignments(activeAssignments);
      const assignmentIds = activeAssignments.map((a: any) => a.id);

      // 4. Calculate stats
      let assignmentsTotal = 0;
      let assignmentsCompleted = 0;
      if (assignmentIds.length) {
        const { count: totalCount } = await supabase
          .from("student_assignments")
          .select("id", { count: "exact", head: true })
          .in("assignment_id", assignmentIds);
        assignmentsTotal = totalCount || 0;

        const { count: completedCount } = await supabase
          .from("student_assignments")
          .select("id", { count: "exact", head: true })
          .in("assignment_id", assignmentIds)
          .neq("status", "pending");
        assignmentsCompleted = completedCount || 0;
      }
      const assignmentsCompletionPercent = assignmentsTotal
        ? Math.round((assignmentsCompleted / assignmentsTotal) * 100)
        : 0;

      // 5. Fetch submissions pending review
      if (studentIds.length && assignmentIds.length) {
        const { data: subsData } = await supabase
          .from("student_assignments")
          .select("*, assignments(title), students(user_id)")
          .in("student_id", studentIds)
          .in("assignment_id", assignmentIds)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false })
          .limit(5);

        if (subsData && subsData.length) {
          const userIds = subsData.map((d: any) => d.students?.user_id).filter(Boolean);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
          const formatted = subsData.map((d: any) => ({
            id: d.id,
            assignmentId: d.assignment_id,
            title: d.assignments?.title || "Assignment",
            studentName: profileMap.get(d.students?.user_id) || "Unknown Student",
            submittedAt: d.submitted_at
          }));
          setRecentSubmissions(formatted);
        } else {
          setRecentSubmissions([]);
        }
      } else {
        setRecentSubmissions([]);
      }

      // 6. Today Activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      let studentsLearningToday = 0;
      if (studentIds.length) {
        const { data: learningRows } = await supabase
          .from("search_history")
          .select("student_id")
          .in("student_id", studentIds)
          .gte("created_at", todayIso)
          .limit(5000);
        const uniq = new Set((learningRows || []).map((r: any) => r.student_id));
        studentsLearningToday = uniq.size;
      }

      let studentsQuizToday = 0;
      if (studentIds.length) {
        const { data: quizRows } = await supabase
          .from("quiz_attempts")
          .select("student_id")
          .in("student_id", studentIds)
          .gte("created_at", todayIso)
          .limit(5000);
        const uniq = new Set((quizRows || []).map((r: any) => r.student_id));
        studentsQuizToday = uniq.size;
      }

      setStats({
        assignmentsCompletionPercent,
        assignmentsCompleted,
        assignmentsTotal,
        studentsLearningToday,
        studentsQuizToday,
        totalStudents: studentIds.length,
      });
    } catch (err: any) {
      console.error("TeacherDashboard load error:", err);
      toast.error("Error loading dashboard data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const learningTodayPercent = useMemo(() => {
    return stats.totalStudents ? Math.round((stats.studentsLearningToday / stats.totalStudents) * 100) : 0;
  }, [stats.studentsLearningToday, stats.totalStudents]);

  const quizTodayPercent = useMemo(() => {
    return stats.totalStudents ? Math.round((stats.studentsQuizToday / stats.totalStudents) * 100) : 0;
  }, [stats.studentsQuizToday, stats.totalStudents]);

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Class code copied! 📋");
  };

  const classMap = useMemo(() => {
    return new Map(classes.map((c) => [c.id, c.name]));
  }, [classes]);

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1">Galactic control center for your classes</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : classes.length === 0 ? (
          <EmptyState
            title="Welcome to your dashboard"
            message="Create your first class to get started"
            icon={LayoutDashboard}
            action={
              <Button onClick={() => (window.location.href = "/teacher/classes")} className="bg-primary hover:bg-primary/90 mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Go to Classes
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Stats overview */}
              {stats.totalStudents > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RadialProgress
                    value={stats.assignmentsCompletionPercent}
                    label="Assignments finished"
                    footerText={`${stats.assignmentsCompleted}/${stats.assignmentsTotal} submissions`}
                  />
                  <RadialProgress
                    value={learningTodayPercent}
                    label="Learning today"
                    footerText={`${stats.studentsLearningToday}/${stats.totalStudents} students`}
                  />
                  <RadialProgress
                    value={quizTodayPercent}
                    label="Quizzes today"
                    footerText={`${stats.studentsQuizToday}/${stats.totalStudents} students`}
                  />
                </div>
              ) : (
                <Card className="bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 border-primary/20">
                  <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground text-base">Invite Students to Begin! 🚀</h4>
                      <p className="text-sm text-muted-foreground">
                        Your classes are set up, but no students have joined yet. Share your class codes below to start tracking learning statistics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Grid of Classes & Assignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Classes card */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      My Classes ({classes.length})
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-primary hover:text-primary/80"
                      onClick={() => (window.location.href = "/teacher/classes")}
                    >
                      Manage
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {classes.slice(0, 4).map((cls) => (
                      <div key={cls.id} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 border border-border">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">Grade {cls.grade_level || "N/A"}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 shrink-0"
                          onClick={() => copyClassCode(cls.class_code)}
                          title="Click to copy class code"
                        >
                          <Copy className="w-3 h-3" />
                          {cls.class_code}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Assignments card */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-secondary" />
                      Recent Assignments ({assignments.length})
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-secondary hover:text-secondary/80"
                      onClick={() => (window.location.href = "/teacher/assignments")}
                    >
                      Manage
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No assignments created yet.</p>
                    ) : (
                      assignments.slice(0, 4).map((a) => (
                        <div key={a.id} className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-semibold text-foreground text-sm truncate">{a.title}</p>
                            <span className="text-[10px] bg-secondary/15 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded uppercase font-mono">
                              {classMap.get(a.class_id) || "Class"}
                            </span>
                          </div>
                          {a.due_date && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due: {new Date(a.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Submissions Pending Review */}
              <div className="space-y-4 pt-2">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Submissions Pending Review
                </h3>
                {recentSubmissions.length === 0 ? (
                  <Card className="bg-card border-border/60">
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      {stats.totalStudents > 0 
                        ? "All assignment submissions have been graded! 🎉" 
                        : "Submissions will appear here once students join your class."}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.map((sub) => (
                      <Card key={sub.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                        <CardContent className="p-4 flex justify-between items-center flex-wrap gap-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground text-sm">{sub.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted by <span className="text-foreground/80 font-medium">{sub.studentName}</span> • {new Date(sub.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => (window.location.href = `/teacher/grading?assignment=${sub.assignmentId}`)}
                            className="border-primary/20 text-primary hover:bg-primary/10 text-xs gap-1"
                          >
                            Grade Submissions <ArrowRight className="w-3 h-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            <div className="lg:col-span-1">
              <NotesAgent title="Teaching Notes" subtitle="For you to help remember" noteType="personal" />
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


