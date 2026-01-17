import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatsCard } from "@/components/cards/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Baby, Brain, Bell, Trophy, BookOpen, Target, Link2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import NotesAgent from "@/components/NotesAgent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadialProgress } from "@/components/ui/radial-progress";

interface ChildData {
  id: string;
  user_id?: string;
  name: string;
  linked_parent_name?: string | null;
  gender?: string | null;
  phone?: string | null;
  xp_points: number;
  focus_score: number;
  grade_level: number | null;
  class_id?: string | null;
  class_name?: string | null;
  class_code?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  topics_completed: number;
  quizzes_attempted: number;
  quizzes_passed: number;
  average_score: number;
  study_time_minutes: number;
  assignments_submitted: number;
  assignments_graded: number;
  avg_assignment_percent: number;
  latest_ai_feedback: string | null;
}

interface GradeSummary {
  id: string;
  title: string;
  score: number | null;
  max_score: number | null;
  reviewed_at: string | null;
  teacher_feedback: string | null;
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

const childLabel = (gender?: string | null) => {
  switch (gender) {
    case "male":
      return "Son";
    case "female":
      return "Daughter";
    default:
      return "Child";
  }
};

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [parentName, setParentName] = useState("");
  const [isSavingParentName, setIsSavingParentName] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const loadParentName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return;
    setParentName(data?.full_name || "");
  };

  const saveParentName = async () => {
    const name = parentName.trim();
    if (!name) {
      toast.error("Please enter your name");
      return;
    }
    setIsSavingParentName(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("user_id", user.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Name saved");
    } finally {
      setIsSavingParentName(false);
    }
  };

  const fetchChildren = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChildren([]);
        return;
      }

      // Load the parent's display name (for the header + default link value)
      await loadParentName();

      const { data: parentStudents, error: parentStudentsError } = await supabase
        .from("parent_students")
        .select("student_id, parent_name")
        .eq("parent_id", user.id);

      if (parentStudentsError) {
        toast.error(parentStudentsError.message);
        setChildren([]);
        return;
      }

      if (!parentStudents || parentStudents.length === 0) {
        setChildren([]);
        return;
      }

      const studentIds = parentStudents.map((ps: any) => ps.student_id);
      const parentNameByStudentId = new Map<string, string | null>();
      (parentStudents as any[]).forEach((ps: any) => {
        if (ps?.student_id) parentNameByStudentId.set(ps.student_id, ps.parent_name ?? null);
      });
      // Do NOT join `students -> profiles` via PostgREST here.
      // There is no FK relationship between these tables (both reference auth.users via user_id),
      // so a relationship join will fail with: "Could not find a relationship... in the schema cache".
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .in("id", studentIds);

      if (studentsError) {
        toast.error(studentsError.message);
        setChildren([]);
        return;
      }

      if (!students || students.length === 0) {
        // This typically means the link exists but parent lacks SELECT policies on students/profiles.
        toast.error("Child linked, but the parent account cannot read student records yet. Please apply the latest RLS policies in Supabase.");
        setChildren([]);
        return;
      }

      const studentUserIds = Array.from(new Set((students || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
      const classIds = Array.from(new Set((students || []).map((s: any) => s.class_id).filter(Boolean))) as string[];

      const [{ data: profiles, error: profilesError }, { data: classes, error: classesError }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone").in("user_id", studentUserIds),
        classIds.length ? supabase.from("classes").select("id, name, class_code, teacher_id").in("id", classIds) : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (profilesError) toast.error(profilesError.message);
      if (classesError) toast.error(classesError.message);

      const nameByUserId = new Map<string, string>();
      const phoneByUserId = new Map<string, string | null>();
      (profiles || []).forEach((p: any) => {
        if (!p?.user_id) return;
        nameByUserId.set(p.user_id, p.full_name || "Unknown");
        phoneByUserId.set(p.user_id, p.phone ?? null);
      });

      const classById = new Map<string, any>();
      (classes || []).forEach((c: any) => {
        if (c?.id) classById.set(c.id, c);
      });

      const teacherIds = Array.from(new Set((classes || []).map((c: any) => c.teacher_id).filter(Boolean))) as string[];
      const { data: teacherProfiles, error: teacherProfilesError } = teacherIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds)
        : { data: [], error: null };
      if (teacherProfilesError) toast.error(teacherProfilesError.message);

      const teacherNameByUserId = new Map<string, string>();
      (teacherProfiles || []).forEach((p: any) => {
        if (p?.user_id) teacherNameByUserId.set(p.user_id, p.full_name || "Unknown");
      });

      const enrichedChildren = await Promise.all(
        students.map(async (s: any) => {
            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_attempted, quizzes_passed, average_score, study_time_minutes")
              .eq("student_id", s.id);

            const { count: quizAttemptsCount } = await supabase
              .from("quiz_attempts")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id);

            const { count: submittedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .neq("status", "pending");

            const { count: gradedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .eq("status", "reviewed");

            const { data: gradedRows } = await supabase
              .from("student_assignments")
              .select("score, assignments(max_score)")
              .eq("student_id", s.id)
              .eq("status", "reviewed")
              .order("reviewed_at", { ascending: false })
              .limit(25);

            const assignmentPercents = (gradedRows || [])
              .map((r: any) => {
                const max = Number(r.assignments?.max_score ?? 0);
                const score = Number(r.score ?? 0);
                if (!max || !Number.isFinite(max) || max <= 0) return null;
                return Math.round((score / max) * 100);
              })
              .filter((v: any) => typeof v === "number") as number[];
            const avgAssignmentPercent = assignmentPercents.length
              ? Math.round(assignmentPercents.reduce((a, b) => a + b, 0) / assignmentPercents.length)
              : 0;

            const { data: latestFeedback } = await supabase
              .from("ai_feedback")
              .select("feedback_text")
              .eq("student_id", s.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const totals = (analytics || []).reduce(
              (acc, a) => ({
                topics_completed: acc.topics_completed + (a.topics_completed || 0),
                quizzes_attempted: acc.quizzes_attempted + (a.quizzes_attempted || 0),
                quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                average_score: acc.average_score + (Number(a.average_score) || 0),
                study_time_minutes: acc.study_time_minutes + (a.study_time_minutes || 0),
              }),
              { topics_completed: 0, quizzes_attempted: 0, quizzes_passed: 0, average_score: 0, study_time_minutes: 0 }
            );

            return {
              id: s.id,
              user_id: s.user_id,
              name: nameByUserId.get(s.user_id) || "Unknown",
              linked_parent_name: parentNameByStudentId.get(s.id) ?? null,
              gender: s.gender ?? null,
              phone: s.user_id ? (phoneByUserId.get(s.user_id) ?? null) : null,
              xp_points: s.xp_points || 0,
              focus_score: s.focus_score || 100,
              grade_level: s.grade_level,
              class_id: s.class_id ?? null,
              class_name: s.class_id ? (classById.get(s.class_id)?.name ?? null) : null,
              class_code: s.class_id ? (classById.get(s.class_id)?.class_code ?? null) : null,
              teacher_id: s.class_id ? (classById.get(s.class_id)?.teacher_id ?? null) : null,
              teacher_name: s.class_id ? (teacherNameByUserId.get(classById.get(s.class_id)?.teacher_id) ?? null) : null,
              topics_completed: totals.topics_completed,
              quizzes_attempted: quizAttemptsCount || totals.quizzes_attempted,
              quizzes_passed: totals.quizzes_passed,
              average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
              study_time_minutes: totals.study_time_minutes,
              assignments_submitted: submittedCount || 0,
              assignments_graded: gradedCount || 0,
              avg_assignment_percent: avgAssignmentPercent,
              latest_ai_feedback: latestFeedback?.feedback_text || null,
            };
        })
      );

      setChildren(enrichedChildren);
    } finally {
      setIsLoading(false);
    }
  };

  // Note: In a real app, you'd have a proper linking mechanism. This is simplified.
  const linkChild = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter a student code");
      return;
    }

    const name = parentName.trim();
    if (!name) {
      toast.error("Please enter your name (Parent name)");
      return;
    }

    setIsLinking(true);
    try {
      const code = linkCode.trim().toUpperCase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      // Save parent name to profile (so it persists across sessions)
      await supabase.from("profiles").update({ full_name: name }).eq("user_id", user.id);

      const { data: linkedStudentId, error } = await supabase.rpc("parent_link_student_by_code", {
        _student_code: code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      // Persist the parent-provided name on the specific link row.
      if (linkedStudentId) {
        const { error: linkUpdateError } = await supabase
          .from("parent_students")
          .update({ parent_name: name })
          .eq("parent_id", user.id)
          .eq("student_id", linkedStudentId);
        if (linkUpdateError) {
          // This most commonly fails if the UPDATE policy hasn't been applied yet.
          toast.error(linkUpdateError.message);
        }
      }

      toast.success("Child linked successfully");
      setLinkCode("");
      await fetchChildren();

      // If the insert succeeded but the parent cannot read the link table due to missing RLS policy,
      // the dashboard will still look empty. Detect that and give a concrete hint.
      const { count } = await supabase
        .from("parent_students")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id);

      if ((count ?? 0) === 0) {
        toast.error(
          "Link saved, but the parent account cannot read linked children yet (missing RLS policy on parent_students). Run the latest Supabase SQL migrations for parent visibility."
        );
      }
    } finally {
      setIsLinking(false);
    }
  };

  const totalXP = children.reduce((sum, c) => sum + c.xp_points, 0);
  const avgFocus = children.length > 0 
    ? Math.round(children.reduce((sum, c) => sum + c.focus_score, 0) / children.length) 
    : 0;

  const toHours = (mins: number) => {
    const m = Number(mins || 0);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };

  const overallProgress = (c: ChildData) => {
    // A simple parent-friendly score (0..100) combining focus, quiz performance, and assignment grades.
    const focus = Math.max(0, Math.min(100, c.focus_score || 0));
    const quiz = Math.max(0, Math.min(100, c.average_score || 0));
    const assn = Math.max(0, Math.min(100, c.avg_assignment_percent || 0));
    return Math.round((focus + quiz + assn) / 3);
  };

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Track your child's learning progress</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="py-5">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Parent name (shown on your linked children)</p>
                <Input
                  placeholder="Enter your name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <Button
                onClick={saveParentName}
                disabled={isSavingParentName || !parentName.trim()}
                variant="outline"
              >
                {isSavingParentName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save name"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Children" value={children.length} icon={Baby} variant="primary" />
                <StatsCard title="Total XP" value={totalXP} icon={Trophy} variant="accent" />
                <StatsCard title="Avg Focus" value={`${avgFocus}%`} icon={Brain} variant="secondary" />
                <StatsCard title="Topics" value={children.reduce((s, c) => s + c.topics_completed, 0)} icon={BookOpen} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="bg-card border-border hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="font-display text-lg text-foreground">{child.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {childLabel(child.gender)} • Grade {child.grade_level || "N/A"}
                        {child.phone ? (
                          <>
                            <span className="text-muted-foreground"> • </span>
                            <span>Phone {child.phone}</span>
                          </>
                        ) : null}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          <span className="text-foreground/80">Parent:</span> {child.linked_parent_name || parentName || "—"}
                        </span>
                        {child.class_name ? (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-foreground/80">Class:</span> {child.class_name}
                              {child.class_code ? <span className="text-muted-foreground"> ({child.class_code})</span> : null}
                            </span>
                          </>
                        ) : null}
                        {child.teacher_name ? (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-foreground/80">Teacher:</span> {child.teacher_name}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <RadialProgress
                          value={overallProgress(child)}
                          label="Overall status"
                          footerText={`Study time: ${toHours(child.study_time_minutes)}`}
                        />
                        <RadialProgress
                          value={child.average_score}
                          label="Quiz performance"
                          centerText={`${child.average_score}%`}
                          footerText={`${child.quizzes_attempted} quizzes attempted`}
                        />
                        <RadialProgress
                          value={child.avg_assignment_percent}
                          label="Assignments"
                          centerText={`${child.avg_assignment_percent}%`}
                          footerText={`${child.assignments_submitted} submitted • ${child.assignments_graded} graded`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">XP Points</p>
                          <p className="text-lg font-bold text-accent">{child.xp_points}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Focus</p>
                          <p className="text-lg font-bold text-foreground">{child.focus_score}%</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">Latest AI feedback</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => (window.location.href = "/parent/ai-feedback")}
                          >
                            View
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {child.latest_ai_feedback || "No AI feedback yet."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <NotesAgent
                title="Parent Notes"
                subtitle="For you to help remember"
                noteType="personal"
              />
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

export function ParentChildProgress() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentGradesByChild, setRecentGradesByChild] = useState<Record<string, GradeSummary[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: parentStudents, error: parentStudentsError } = await supabase
          .from("parent_students")
          .select("student_id")
          .eq("parent_id", user.id);

        if (parentStudentsError) {
          toast.error(parentStudentsError.message);
          return;
        }

        if (!parentStudents || parentStudents.length === 0) {
          setChildren([]);
          return;
        }

        const studentIds = parentStudents.map((ps) => ps.student_id);
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .in("id", studentIds);

        if (studentsError) {
          toast.error(studentsError.message);
          return;
        }

        const studentUserIds = Array.from(new Set((students || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
        const classIds = Array.from(new Set((students || []).map((s: any) => s.class_id).filter(Boolean))) as string[];

        const [{ data: profiles, error: profilesError }, { data: classes, error: classesError }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", studentUserIds),
          classIds.length ? supabase.from("classes").select("id, name, class_code, teacher_id").in("id", classIds) : Promise.resolve({ data: [], error: null } as any),
        ]);
        if (profilesError) toast.error(profilesError.message);
        if (classesError) toast.error(classesError.message);

        const nameByUserId = new Map<string, string>();
        const phoneByUserId = new Map<string, string | null>();
        (profiles || []).forEach((p: any) => {
          if (!p?.user_id) return;
          nameByUserId.set(p.user_id, p.full_name || "Unknown");
          phoneByUserId.set(p.user_id, p.phone ?? null);
        });

        const classById = new Map<string, any>();
        (classes || []).forEach((c: any) => {
          if (c?.id) classById.set(c.id, c);
        });

        const teacherIds = Array.from(new Set((classes || []).map((c: any) => c.teacher_id).filter(Boolean))) as string[];
        const { data: teacherProfiles } = teacherIds.length
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds)
          : { data: [] };

        const teacherNameByUserId = new Map<string, string>();
        (teacherProfiles || []).forEach((p: any) => {
          if (p?.user_id) teacherNameByUserId.set(p.user_id, p.full_name || "Unknown");
        });

        const enrichedChildren = await Promise.all(
          (students || []).map(async (s: any) => {
            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_attempted, quizzes_passed, average_score, study_time_minutes")
              .eq("student_id", s.id);

            const { count: quizAttemptsCount } = await supabase
              .from("quiz_attempts")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id);

            const { count: submittedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .neq("status", "pending");

            const { count: gradedCount } = await supabase
              .from("student_assignments")
              .select("id", { count: "exact", head: true })
              .eq("student_id", s.id)
              .eq("status", "reviewed");

            const { data: gradedRows } = await supabase
              .from("student_assignments")
              .select("score, assignments(max_score)")
              .eq("student_id", s.id)
              .eq("status", "reviewed")
              .order("reviewed_at", { ascending: false })
              .limit(25);

            const assignmentPercents = (gradedRows || [])
              .map((r: any) => {
                const max = Number(r.assignments?.max_score ?? 0);
                const score = Number(r.score ?? 0);
                if (!max || !Number.isFinite(max) || max <= 0) return null;
                return Math.round((score / max) * 100);
              })
              .filter((v: any) => typeof v === "number") as number[];
            const avgAssignmentPercent = assignmentPercents.length
              ? Math.round(assignmentPercents.reduce((a, b) => a + b, 0) / assignmentPercents.length)
              : 0;

            const { data: latestFeedback } = await supabase
              .from("ai_feedback")
              .select("feedback_text")
              .eq("student_id", s.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const totals = (analytics || []).reduce(
              (acc, a) => ({
                topics_completed: acc.topics_completed + (a.topics_completed || 0),
                quizzes_attempted: acc.quizzes_attempted + (a.quizzes_attempted || 0),
                quizzes_passed: acc.quizzes_passed + (a.quizzes_passed || 0),
                average_score: acc.average_score + (Number(a.average_score) || 0),
                study_time_minutes: acc.study_time_minutes + (a.study_time_minutes || 0),
              }),
              { topics_completed: 0, quizzes_attempted: 0, quizzes_passed: 0, average_score: 0, study_time_minutes: 0 }
            );

            const childClass = s.class_id ? classById.get(s.class_id) : null;
            const teacherId = childClass?.teacher_id ?? null;

            return {
              id: s.id,
              user_id: s.user_id,
              name: nameByUserId.get(s.user_id) || "Unknown",
              gender: s.gender ?? null,
              phone: s.user_id ? (phoneByUserId.get(s.user_id) ?? null) : null,
              xp_points: s.xp_points || 0,
              focus_score: s.focus_score || 100,
              grade_level: s.grade_level,
              class_id: s.class_id ?? null,
              class_name: childClass?.name ?? null,
              class_code: childClass?.class_code ?? null,
              teacher_id: teacherId,
              teacher_name: teacherId ? (teacherNameByUserId.get(teacherId) ?? null) : null,
              topics_completed: totals.topics_completed,
              quizzes_attempted: quizAttemptsCount || totals.quizzes_attempted,
              quizzes_passed: totals.quizzes_passed,
              average_score: analytics?.length ? Math.round(totals.average_score / analytics.length) : 0,
              study_time_minutes: totals.study_time_minutes,
              assignments_submitted: submittedCount || 0,
              assignments_graded: gradedCount || 0,
              avg_assignment_percent: avgAssignmentPercent,
              latest_ai_feedback: latestFeedback?.feedback_text || null,
            } as ChildData;
          })
        );

        setChildren(enrichedChildren);

          const { data: gradedData, error: gradedError } = await supabase
            .from("student_assignments")
            .select("id, student_id, score, teacher_feedback, reviewed_at, assignments(title, max_score)")
            .in("student_id", studentIds)
            .eq("status", "reviewed")
            .order("reviewed_at", { ascending: false })
            .limit(50);

          if (gradedError) {
            console.error("Failed to load child grades", gradedError);
          }

          const grouped = (gradedData || []).reduce<Record<string, GradeSummary[]>>((acc, row: any) => {
            const sid = row.student_id as string;
            if (!sid) return acc;
            const list = acc[sid] || [];
            if (list.length >= 3) return acc;
            list.push({
              id: row.id,
              title: row.assignments?.title || "Assignment",
              score: row.score,
              max_score: row.assignments?.max_score ?? null,
              reviewed_at: row.reviewed_at,
              teacher_feedback: row.teacher_feedback,
            });
            acc[sid] = list;
            return acc;
          }, {});

          setRecentGradesByChild(grouped);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toHours = (mins: number) => {
    const m = Number(mins || 0);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };

  const overallProgress = (c: ChildData) => {
    const focus = Math.max(0, Math.min(100, c.focus_score || 0));
    const quiz = Math.max(0, Math.min(100, c.average_score || 0));
    const assn = Math.max(0, Math.min(100, c.avg_assignment_percent || 0));
    return Math.round((focus + quiz + assn) / 3);
  };

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
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    <div>
                      <span className="text-foreground/80">{childLabel(child.gender)} • Grade:</span> {child.grade_level ?? "N/A"}
                      {child.class_name ? (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-foreground/80">Class:</span> {child.class_name}
                          {child.class_code ? <span className="text-muted-foreground"> ({child.class_code})</span> : null}
                        </>
                      ) : null}
                    </div>
                    {child.phone ? (
                      <div>
                        <span className="text-foreground/80">Phone:</span> {child.phone}
                      </div>
                    ) : null}
                    {child.teacher_name ? (
                      <div>
                        <span className="text-foreground/80">Teacher:</span> {child.teacher_name}
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <RadialProgress
                      value={overallProgress(child)}
                      label="Overall status"
                      footerText={`Study time: ${toHours(child.study_time_minutes)}`}
                    />
                    <RadialProgress
                      value={child.average_score}
                      label="Quiz performance"
                      centerText={`${child.average_score}%`}
                      footerText={`${child.quizzes_attempted} quizzes attempted`}
                    />
                    <RadialProgress
                      value={child.avg_assignment_percent}
                      label="Assignments"
                      centerText={`${child.avg_assignment_percent}%`}
                      footerText={`${child.assignments_submitted} submitted • ${child.assignments_graded} graded`}
                    />
                  </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Study time</p>
                      <p className="text-xl font-semibold text-foreground">{toHours(child.study_time_minutes)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Quizzes attempted</p>
                      <p className="text-xl font-semibold text-foreground">{child.quizzes_attempted}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm text-muted-foreground">Assignments</p>
                      <p className="text-xl font-semibold text-foreground">
                        {child.assignments_submitted} submitted • {child.assignments_graded} graded
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Latest AI feedback</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = "/parent/ai-feedback")}
                      >
                        View
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {child.latest_ai_feedback || "No AI feedback yet."}
                    </p>
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

                  {recentGradesByChild[child.id]?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground">Recent Graded Assignments</h4>
                      <div className="space-y-2">
                        {recentGradesByChild[child.id].map((g) => (
                          <div key={g.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{g.title}</p>
                                {g.reviewed_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(g.reviewed_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-accent whitespace-nowrap">
                                {g.score ?? "-"}/{g.max_score ?? "-"}
                              </p>
                            </div>
                            {g.teacher_feedback && (
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{g.teacher_feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          .select("id, user_id")
          .in("id", studentIds);

        const userIds = Array.from(new Set((students || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
        const { data: profiles } = userIds.length
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
          : { data: [] };

        const nameByUserId = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          if (p?.user_id) nameByUserId.set(p.user_id, p.full_name || "Unknown");
        });

        const { data: feedbackData } = await supabase
          .from("ai_feedback")
          .select("*")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false });

        if (feedbackData) {
          const enriched = feedbackData.map((f) => ({
            ...f,
            student_name:
              nameByUserId.get((students?.find((s: any) => s.id === f.student_id) as any)?.user_id) || "Unknown",
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
