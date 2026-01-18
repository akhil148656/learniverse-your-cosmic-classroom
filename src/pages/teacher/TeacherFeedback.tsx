import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Users, Loader2, Trash2, CheckCircle } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
}

interface StudentData {
  id: string;
  user_id: string;
  profile_name: string | null;
  xp_points: number | null;
  focus_score: number | null;
}

interface FeedbackData {
  id: string;
  student_id?: string;
  feedback_text: string;
  category: string | null;
  created_at: string;
  student_name?: string;
  teacher_acknowledged?: boolean | null;
  teacher_acknowledged_at?: string | null;
}

export default function TeacherFeedback() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const fetchFeedbackData = async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStudents([]);
      setFeedbackList([]);
      if (showLoading) setIsLoading(false);
      return;
    }

    // Fetch students
    // Do NOT join `students -> profiles` via PostgREST (no FK relationship).
    let studentsQuery = supabase.from("students").select("id, user_id, xp_points, focus_score, class_id");

    if (selectedClass !== "all") {
      studentsQuery = studentsQuery.eq("class_id", selectedClass);
    } else {
      const classIds = classes.map((c) => c.id);
      if (classIds.length > 0) {
        studentsQuery = studentsQuery.in("class_id", classIds);
      }
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;
    if (studentsError) {
      console.error("Failed to load students", studentsError);
      toast.error(studentsError.message);
      setStudents([]);
      setFeedbackList([]);
      if (showLoading) setIsLoading(false);
      return;
    }

    const userIds = Array.from(new Set((studentsData || []).map((s: any) => s.user_id).filter(Boolean))) as string[];
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
      : { data: [], error: null };
    if (profilesError) {
      console.warn("Could not load student names", profilesError);
    }

    const nameByUserId = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      if (p?.user_id) nameByUserId.set(p.user_id, p.full_name || "Unknown");
    });

    const formattedStudents = (studentsData || []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      profile_name: nameByUserId.get(s.user_id) || "Unknown",
      xp_points: s.xp_points,
      focus_score: s.focus_score,
    }));
    setStudents(formattedStudents);

    // Fetch existing feedback
    if (formattedStudents.length > 0) {
      const studentIds = formattedStudents.map((s) => s.id);
      const { data: feedbackData } = await supabase
        .from("ai_feedback")
        .select("*")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });

      const enrichedFeedback = (feedbackData || []).map((f: any) => ({
        ...f,
        student_name: formattedStudents.find((s) => s.id === f.student_id)?.profile_name || "Unknown",
      }));
      setFeedbackList(enrichedFeedback);
    } else {
      setFeedbackList([]);
    }

    if (showLoading) setIsLoading(false);
  };

  const refreshNow = async (opts?: { silent?: boolean }) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchFeedbackData({ showLoading: false });
      if (!opts?.silent) toast.success("Refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const acceptFeedback = async (feedbackId: string) => {
    // If this is a client-only placeholder (e.g. Date.now()), just hide it.
    if (!isUuid(feedbackId)) {
      setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Feedback accepted");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        return;
      }

      const patch = {
        teacher_acknowledged: true,
        teacher_acknowledged_at: new Date().toISOString(),
        teacher_acknowledged_by: user.id,
      };

      const { error } = await supabase.from("ai_feedback").update(patch).eq("id", feedbackId);
      if (error) {
        toast.error(error.message || "Failed to accept feedback");
        return;
      }

      // Optional: send a teacher suggestion to the student as a notification.
      // Keep it lightweight: prompt input and deliver to Student Alerts.
      try {
        const suggestion = window
          .prompt("Optional: Add a short teacher suggestion for the student (will appear in Student Alerts).", "")
          ?.trim();

        if (suggestion) {
          const row = feedbackList.find((f) => f.id === feedbackId);
          const studentId = row?.student_id ?? null;

          if (studentId) {
            const { data: studentRow } = await supabase
              .from("students")
              .select("user_id")
              .eq("id", studentId)
              .maybeSingle();

            const studentUserId = (studentRow as any)?.user_id ?? null;
            if (studentUserId) {
              const title = "Teacher suggestion";
              const msg = `For ${row?.student_name || "you"}: ${suggestion}`;

              const { error: notifErr } = await supabase
                .from("notifications")
                .insert({
                  user_id: studentUserId,
                  title,
                  message: msg,
                  type: "info",
                  link: "/student/alerts",
                } as any);

              if (notifErr) {
                console.warn("Failed to insert student notification", notifErr);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Teacher suggestion prompt/insert failed", e);
      }

      // Remove from list immediately after accept (as requested).
      setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Feedback accepted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to accept feedback");
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!window.confirm("Delete this feedback?")) return;

    // If this is a client-only placeholder (e.g. Date.now()), just remove it.
    if (!isUuid(feedbackId)) {
      setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Feedback deleted");
      return;
    }

    try {
      const { error } = await supabase.from("ai_feedback").delete().eq("id", feedbackId);
      if (error) {
        toast.error(error.message || "Failed to delete feedback");
        return;
      }
      setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Feedback deleted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to delete feedback");
    }
  };

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
    if (classes.length > 0 || selectedClass === "all") {
      void fetchFeedbackData();
    }
  }, [selectedClass, classes]);

  const generateFeedback = async (studentId: string) => {
    setGeneratingFor(studentId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ studentId }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        try {
          const parsed = JSON.parse(errorText);
          const msg = typeof parsed?.error === "string" ? parsed.error : "";
          throw new Error(msg || errorText || `Failed to generate feedback (HTTP ${response.status})`);
        } catch {
          throw new Error(errorText || `Failed to generate feedback (HTTP ${response.status})`);
        }
      }

      const data = await response.json();
      const provider = typeof data?.provider === "string" ? data.provider : null;
      const model = typeof data?.model === "string" ? data.model : null;
      toast.success(provider ? `AI feedback generated (${provider}${model ? `: ${model}` : ""})` : "AI feedback generated successfully!");

      // Prefer refreshing from DB so we always have real UUID ids (avoids uuid errors on Accept/Delete)
      // But if the backend reports `saved:false`, still show a local card so the teacher sees the result.
      if (data?.saved) {
        await refreshNow({ silent: true });
      } else {
        const saveErrorMessage =
          typeof data?.saveError?.message === "string" ? String(data.saveError.message) : "";
        const studentName = students.find((s) => s.id === studentId)?.profile_name || "Unknown";
        const text = typeof data?.feedback === "string" ? data.feedback : "";
        const category = typeof data?.category === "string" ? data.category : null;

        if (text) {
          setFeedbackList((prev) => [
            {
              id: String(Date.now()),
              student_id: studentId,
              feedback_text: text,
              category,
              created_at: new Date().toISOString(),
              student_name: studentName,
              teacher_acknowledged: false,
            },
            ...prev,
          ]);
          toast.warning(
            saveErrorMessage
              ? `Feedback generated, but it was not saved: ${saveErrorMessage}`
              : "Feedback generated, but it was not saved — showing it locally."
          );
        } else {
          toast.error("Feedback generated, but no text was returned.");
        }
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      const raw = error instanceof Error ? error.message : String(error);
      if (/models\/gemini-1\.5-flash\s+is\s+not\s+found/i.test(raw)) {
        toast.error(
          "AI model not found. In Supabase Edge Function env vars, set GEMINI_MODEL=gemini-1.5-flash-001 (or remove GEMINI_MODEL)."
        );
      } else if (/GEMINI_API_KEY/i.test(raw)) {
        toast.error("AI not configured. Add GEMINI_API_KEY in Supabase Edge Function secrets.");
      } else if (/SUPABASE_SERVICE_ROLE_KEY|service role/i.test(raw)) {
        toast.error("Backend missing SUPABASE_SERVICE_ROLE_KEY for this function.");
      } else {
        toast.error(raw ? String(raw).replace(/\s+/g, " ").trim().slice(0, 220) : "Failed to generate feedback");
      }
    }
    setGeneratingFor(null);
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
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">AI Feedback</h1>
            <p className="text-muted-foreground">Generate AI-powered feedback for students and parents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshNow} disabled={isRefreshing || isLoading} className="gap-2">
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
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
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            message="Students will appear here once they join your classes"
            icon={Users}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Students ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{student.profile_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.xp_points || 0} XP • {student.focus_score || 100}% Focus
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateFeedback(student.id)}
                      disabled={generatingFor === student.id}
                      className="gap-2"
                    >
                      {generatingFor === student.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  Recent Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {feedbackList.length > 0 ? (
                  feedbackList.map((feedback) => (
                    <div key={feedback.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{feedback.student_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(feedback.category)}`}>
                            {feedback.category || "progress"}
                          </span>
                          {!feedback.teacher_acknowledged ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 gap-1"
                              onClick={() => acceptFeedback(feedback.id)}
                              title="Accept feedback"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Accepted</span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => deleteFeedback(feedback.id)}
                            title="Delete feedback"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-4">{feedback.feedback_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No feedback generated yet. Click "Generate" on a student to create AI feedback.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
