import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { LayoutDashboard, BookOpen, Users, FileText, BarChart3, MessageSquare } from "lucide-react";
import NotesAgent from "@/components/NotesAgent";
import { supabase } from "@/integrations/supabase/client";
import { RadialProgress } from "@/components/ui/radial-progress";

export function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    assignmentsCompletionPercent: 0,
    assignmentsCompleted: 0,
    assignmentsTotal: 0,
    studentsLearningToday: 0,
    studentsQuizToday: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all students in teacher's classes
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", user.id);
      const classIds = (classes || []).map((c: any) => c.id);

      const { data: students } = classIds.length
        ? await supabase.from("students").select("id").in("class_id", classIds)
        : { data: [] as any[] };
      const studentIds = (students || []).map((s: any) => s.id);

      // Assignment completion across teacher's assignments
      const { data: teacherAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("teacher_id", user.id);
      const assignmentIds = (teacherAssignments || []).map((a: any) => a.id);

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

      // Today window
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Students learning today (proxy: search_history activity)
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

      // Students who played quizzes today
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
      setIsLoading(false);
    };

    run();
  }, []);

  const learningTodayPercent = useMemo(() => {
    return stats.totalStudents ? Math.round((stats.studentsLearningToday / stats.totalStudents) * 100) : 0;
  }, [stats.studentsLearningToday, stats.totalStudents]);

  const quizTodayPercent = useMemo(() => {
    return stats.totalStudents ? Math.round((stats.studentsQuizToday / stats.totalStudents) * 100) : 0;
  }, [stats.studentsQuizToday, stats.totalStudents]);

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Teacher Dashboard</h1>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : stats.totalStudents === 0 ? (
          <EmptyState title="Welcome to your dashboard" message="Create classes and add students to see progress" icon={LayoutDashboard} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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

export function TeacherClasses() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">My Classes</h1>
        <EmptyState title="No classes yet" message="Create your first class to get started" icon={BookOpen} />
      </div>
    </PortalLayout>
  );
}

export function TeacherStudents() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Students</h1>
        <EmptyState title="No students yet" message="Students will appear here when they join your class" icon={Users} />
      </div>
    </PortalLayout>
  );
}

export function TeacherAssignments() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Assignments</h1>
        <EmptyState title="No assignments yet" message="Create assignments for your students" icon={FileText} />
      </div>
    </PortalLayout>
  );
}

export function TeacherAnalytics() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
        <EmptyState title="No analytics yet" message="Analytics will appear as students engage with content" icon={BarChart3} />
      </div>
    </PortalLayout>
  );
}

export function TeacherFeedback() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Feedback</h1>
        <EmptyState title="No feedback pending" message="Review and provide feedback on student work" icon={MessageSquare} />
      </div>
    </PortalLayout>
  );
}
