import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, Users, FileText, BarChart3, MessageSquare, ArrowRight, Clock, Copy, Plus, Swords, Trash2 } from "lucide-react";
import NotesAgent from "@/components/NotesAgent";
import { supabase } from "@/integrations/supabase/client";
import { RadialProgress } from "@/components/ui/radial-progress";
import { toast } from "sonner";
import { ClassroomClashLobby } from "@/components/student/ClassroomClashLobby";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

  // Clash states
  const [clashTopic, setClashTopic] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [teacherClashes, setTeacherClashes] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherUserId, setTeacherUserId] = useState("");

  const [showClash, setShowClash] = useState(false);
  const [clashLobbyId, setClashLobbyId] = useState("");
  const [clashRoomTopic, setClashRoomTopic] = useState("");

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setTeacherUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.full_name) setTeacherName(prof.full_name);

      // Fetch teacher scheduled clashes
      try {
        const { data: clashes, error: clashesError } = await supabase
          .from("scheduled_clashes")
          .select("*")
          .order("scheduled_at", { ascending: true });
        
        if (clashesError) {
          const local = localStorage.getItem("local_scheduled_clashes") || "[]";
          setTeacherClashes(JSON.parse(local));
        } else {
          setTeacherClashes(clashes || []);
        }
      } catch (e) {
        console.warn("Could not load clashes from DB:", e);
      }

      // 1. Fetch Classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name, class_code, grade_level")
        .order("created_at", { ascending: false });

      if (classesError) throw classesError;
      const activeClasses = classesData || [];
      setClasses(activeClasses);
      if (activeClasses.length > 0) {
        setSelectedClassId(activeClasses[0].id);
      }
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

  const fetchClashes = async () => {
    try {
      const { data: clashes, error } = await supabase
        .from("scheduled_clashes")
        .select("*")
        .order("scheduled_at", { ascending: true });
      
      if (error) {
        const local = localStorage.getItem("local_scheduled_clashes") || "[]";
        setTeacherClashes(JSON.parse(local));
      } else {
        setTeacherClashes(clashes || []);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLaunchNow = async () => {
    if (!clashTopic.trim()) {
      toast.error("Please enter a topic for the clash");
      return;
    }
    if (!selectedClassId) {
      toast.error("Please select a class to target");
      return;
    }

    const uniqueId = `clash_${Date.now()}`;

    // Add to localStorage
    const local = JSON.parse(localStorage.getItem("local_scheduled_clashes") || "[]");
    const newClash = {
      id: uniqueId,
      class_id: selectedClassId,
      topic: clashTopic,
      scheduled_at: new Date().toISOString(),
      status: "active",
      created_by: teacherUserId
    };
    local.push(newClash);
    localStorage.setItem("local_scheduled_clashes", JSON.stringify(local));

    try {
      await supabase.from("scheduled_clashes").insert({
        id: uniqueId,
        class_id: selectedClassId,
        topic: clashTopic,
        scheduled_at: new Date().toISOString(),
        status: "active",
        created_by: teacherUserId
      });
    } catch (err) {
      console.warn("Could not insert clash in DB, using pure realtime broadcast instead", err);
    }

    // Broadcast live lobby alert to students
    try {
      const channel = supabase.channel(`clashes_class_${selectedClassId}`);
      await channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "teacher_lobby_opened",
            payload: {
              lobbyId: uniqueId,
              topic: clashTopic,
              hostName: teacherName
            }
          });
        }
      });
    } catch (e) {
      console.error(e);
    }

    // Immediately add to teacher's list without DB round-trip
    setTeacherClashes((prev) => [
      ...prev,
      newClash
    ]);

    setClashLobbyId(uniqueId);
    setClashRoomTopic(clashTopic);
    setClashTopic("");
    setShowClash(true);
  };

  const handleScheduleClash = async () => {
    if (!clashTopic.trim()) {
      toast.error("Please enter a topic for the scheduled clash");
      return;
    }
    if (!selectedClassId) {
      toast.error("Please select a class to target");
      return;
    }
    if (!scheduledTime) {
      toast.error("Please select a scheduled date and time");
      return;
    }

    // Save to local storage first for resilience
    const local = JSON.parse(localStorage.getItem("local_scheduled_clashes") || "[]");
    const newClash = {
      id: `local_${Date.now()}`,
      class_id: selectedClassId,
      topic: clashTopic,
      scheduled_at: new Date(scheduledTime).toISOString(),
      status: "scheduled",
      created_by: teacherUserId
    };
    local.push(newClash);
    localStorage.setItem("local_scheduled_clashes", JSON.stringify(local));

    try {
      // 1. Insert Scheduled Clash
      const { error: clashErr } = await supabase.from("scheduled_clashes").insert({
        class_id: selectedClassId,
        topic: clashTopic,
        scheduled_at: new Date(scheduledTime).toISOString(),
        status: "scheduled",
        created_by: teacherUserId
      });

      if (!clashErr) {
        // 2. Fetch students of that class to notify
        const { data: students } = await supabase
          .from("students")
          .select("user_id")
          .eq("class_id", selectedClassId);

        if (students && students.length > 0) {
          const notifications = students.map(s => ({
            user_id: s.user_id,
            title: "📅 Scheduled Classroom Clash",
            message: `Your teacher ${teacherName} has scheduled a quiz clash on "${clashTopic}" for ${new Date(scheduledTime).toLocaleString()}!`,
            type: "info",
            link: "/student/quizzes"
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
    } catch (err: any) {
      console.warn("Database schedule insert failed, running on localStorage fallback only", err);
    }

    // Immediately add to teacher's list without DB round-trip
    setTeacherClashes((prev) => [...prev, newClash]);

    toast.success("Classroom Clash scheduled successfully! 📅");
    setClashTopic("");
    setScheduledTime("");
  };

  const handleActivateScheduled = async (clash: any) => {
    // Update local storage
    const local = JSON.parse(localStorage.getItem("local_scheduled_clashes") || "[]");
    const updated = local.map((c: any) => c.id === clash.id ? { ...c, status: "active" } : c);
    localStorage.setItem("local_scheduled_clashes", JSON.stringify(updated));

    try {
      await supabase
        .from("scheduled_clashes")
        .update({ status: "active" })
        .eq("id", clash.id);
    } catch (err) {
      console.warn("DB update failed:", err);
    }

    // Broadcast live lobby alert to students
    try {
      const channel = supabase.channel(`clashes_class_${clash.class_id}`);
      await channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "teacher_lobby_opened",
            payload: {
              lobbyId: clash.id,
              topic: clash.topic,
              hostName: teacherName
            }
          });
        }
      });
    } catch (e) {
      console.error(e);
    }

    // Immediately mark as active in teacher's list
    setTeacherClashes((prev) =>
      prev.map((c) => c.id === clash.id ? { ...c, status: "active" } : c)
    );

    setClashLobbyId(clash.id);
    setClashRoomTopic(clash.topic);
    setShowClash(true);
  };

  const handleDeleteClash = (id: string) => {
    // Remove from state
    setTeacherClashes((prev) => prev.filter((c) => c.id !== id));
    // Remove from localStorage
    const local = JSON.parse(localStorage.getItem("local_scheduled_clashes") || "[]");
    localStorage.setItem("local_scheduled_clashes", JSON.stringify(local.filter((c: any) => c.id !== id)));
    // Silently try to remove from DB too
    supabase.from("scheduled_clashes").delete().eq("id", id).then(() => {});
    toast.success("Quiz removed.");
  };

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
              <div className="space-y-6">
                {/* Classroom Clash Card */}
                <Card className="bg-card border-border shadow-[0_0_20px_rgba(139,92,246,0.08)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
                      <Swords className="w-5 h-5 text-secondary animate-pulse" />
                      Classroom Clash Panel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-left">
                      {/* Target Class Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Target Class</label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full bg-muted border border-border rounded-md h-9 text-xs px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                        >
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} (Grade {cls.grade_level})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Topic Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Quiz Topic</label>
                        <Input
                          value={clashTopic}
                          onChange={(e) => setClashTopic(e.target.value)}
                          placeholder="e.g. Gravity, Fractions, Cells"
                          className="bg-muted border-border h-9 text-xs"
                        />
                      </div>

                      {/* Schedule Datetime */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Schedule At (Optional)</label>
                        <Input
                          type="datetime-local"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="bg-muted border-border h-9 text-xs text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleLaunchNow}
                        disabled={!clashTopic.trim() || !selectedClassId}
                        className="flex-1 text-xs h-9 border-secondary/50 text-secondary hover:bg-secondary/10"
                      >
                        Launch Now ⚔️
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleScheduleClash}
                        disabled={!clashTopic.trim() || !selectedClassId || !scheduledTime}
                        className="flex-1 text-xs h-9 bg-secondary text-background hover:bg-secondary/90 font-bold"
                      >
                        Schedule 📅
                      </Button>
                    </div>

                    {/* Scheduled Clashes History */}
                    <div className="pt-2 border-t border-border/60 text-left space-y-2">
                      <h5 className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Active & Scheduled Quizzes</h5>
                      {teacherClashes.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground font-mono italic">
                          No scheduled or active quizzes yet. Use the form above to launch one!
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                          {teacherClashes.map((c) => {
                            const isActive = c.status === "active";
                            return (
                              <div key={c.id} className="p-2 rounded-lg bg-muted/40 border border-border/80 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate text-foreground">{c.topic}</p>
                                  <p className="text-[9px] text-muted-foreground font-mono">
                                    {new Date(c.scheduled_at).toLocaleDateString()} {new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {" "}<span className={cn(
                                      "font-bold uppercase tracking-wider",
                                      isActive ? "text-green-400" : "text-slate-400"
                                    )}>{isActive ? "● LIVE" : "○ Scheduled"}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="sm"
                                    className={cn(
                                      "h-6 px-2 text-[9px] font-display font-semibold uppercase tracking-wider text-white",
                                      isActive ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
                                    )}
                                    onClick={() => {
                                      if (isActive) {
                                        setClashLobbyId(c.id);
                                        setClashRoomTopic(c.topic);
                                        setShowClash(true);
                                      } else {
                                        handleActivateScheduled(c);
                                      }
                                    }}
                                  >
                                    {isActive ? "Open" : "Launch"}
                                  </Button>
                                  <button
                                    onClick={() => handleDeleteClash(c.id)}
                                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Delete this quiz"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <NotesAgent title="Teaching Notes" subtitle="For you to help remember" noteType="personal" />
              </div>
            </div>
          </div>
        )}
      </div>

      <ClassroomClashLobby
        isOpen={showClash}
        onClose={() => setShowClash(false)}
        topic={clashRoomTopic}
        lobbyId={clashLobbyId}
        hostName={teacherName}
        role="host"
        onCompleted={() => {
          // Auto-remove finished lobby from list
          handleDeleteClash(clashLobbyId);
          setShowClash(false);
          fetchDashboardData();
        }}
      />
    </PortalLayout>
  );
}


