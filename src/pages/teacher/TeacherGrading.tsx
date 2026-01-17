import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, CheckCircle, User, Clock, Send, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Submission {
  id: string;
  student_id: string;
  status: string;
  submission_text: string | null;
  submission_attachment_path?: string | null;
  submission_attachment_name?: string | null;
  submitted_at: string | null;
  score: number | null;
  teacher_feedback: string | null;
  student_name: string;
  assignment_title: string;
  max_score: number;
}

const SUBMISSIONS_BUCKET = "assignment-submissions";

interface Assignment {
  id: string;
  title: string;
  class_name: string;
}

export default function TeacherGrading() {
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [grading, setGrading] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string }>>({});

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(SUBMISSIONS_BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL", error);
      toast.error("Failed to open attachment");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      fetchSubmissions(selectedAssignment);
    }
  }, [selectedAssignment]);

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("assignments")
      .select("id, title, class_id, classes(name)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((a: any) => ({
        id: a.id,
        title: a.title,
        class_name: a.classes?.name || "No class",
      }));
      setAssignments(formatted);
      
      // Auto-select from URL param or first assignment
      const paramId = searchParams.get("assignment");
      if (paramId && formatted.some(a => a.id === paramId)) {
        setSelectedAssignment(paramId);
      } else if (formatted.length > 0) {
        setSelectedAssignment(formatted[0].id);
      }
    }
    setIsLoading(false);
  };

  const fetchSubmissions = async (assignmentId: string) => {
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("max_score, title")
      .eq("id", assignmentId)
      .single();

    const { data } = await supabase
      .from("student_assignments")
      .select("*, students(user_id)")
      .eq("assignment_id", assignmentId)
      .neq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (data) {
      // Fetch student names
      const userIds = data.map((d: any) => d.students?.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const formatted: Submission[] = data.map((d: any) => ({
        id: d.id,
        student_id: d.student_id,
        status: d.status,
        submission_text: d.submission_text,
        submission_attachment_path: d.submission_attachment_path,
        submission_attachment_name: d.submission_attachment_name,
        submitted_at: d.submitted_at,
        score: d.score,
        teacher_feedback: d.teacher_feedback,
        student_name: profileMap.get(d.students?.user_id) || "Unknown Student",
        assignment_title: assignmentData?.title || "",
        max_score: assignmentData?.max_score || 100,
      }));
      setSubmissions(formatted);
    }
  };

  const gradeSubmission = async (submissionId: string) => {
    const grade = grades[submissionId];
    if (!grade?.score) {
      toast.error("Please enter a score");
      return;
    }

    setGrading(submissionId);
    const { error } = await supabase
      .from("student_assignments")
      .update({
        score: parseInt(grade.score),
        teacher_feedback: grade.feedback || null,
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      const msg = error.message || "Failed to grade submission";
      console.error("Failed to grade submission:", error);
      if (msg.toLowerCase().includes("row-level security")) {
        toast.error("Permission denied by database policy. Run the latest Supabase migrations (RLS policies) and try again.");
      } else {
        toast.error(msg);
      }
    } else {
      toast.success("Submission graded!");
      fetchSubmissions(selectedAssignment);
    }
    setGrading(null);
  };

  const pendingGrading = submissions.filter(s => s.status === "submitted");
  const graded = submissions.filter(s => s.status === "reviewed");

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Grade Submissions</h1>
          <p className="text-muted-foreground">Review and grade student assignment submissions</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No assignments"
            message="Create an assignment first to see submissions"
            icon={FileText}
          />
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Label className="text-foreground">Select Assignment:</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger className="w-[300px] bg-muted border-border">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title} ({a.class_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {submissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                message="Students haven't submitted this assignment yet"
                icon={FileText}
              />
            ) : (
              <div className="space-y-6">
                {pendingGrading.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-xl text-foreground">Pending Review ({pendingGrading.length})</h2>
                    {pendingGrading.map((s) => (
                      <Card key={s.id} className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-primary" />
                              <CardTitle className="font-display text-lg">{s.student_name}</CardTitle>
                            </div>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(s.submitted_at!).toLocaleString()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <p className="text-sm text-muted-foreground mb-2">Student's Submission:</p>
                            <p className="text-foreground whitespace-pre-wrap">{s.submission_text}</p>
                          </div>

                          {s.submission_attachment_path && (
                            <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
                              <div className="text-sm text-muted-foreground truncate">
                                Attachment: <span className="text-foreground">{s.submission_attachment_name || "file"}</span>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => openAttachment(s.submission_attachment_path!)}
                              >
                                View
                              </Button>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Score (out of {s.max_score})</Label>
                              <Input
                                type="number"
                                min="0"
                                max={s.max_score}
                                placeholder="Enter score"
                                value={grades[s.id]?.score || ""}
                                onChange={(e) => setGrades({
                                  ...grades,
                                  [s.id]: { ...grades[s.id], score: e.target.value }
                                })}
                                className="bg-muted border-border"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Feedback (optional)</Label>
                              <Textarea
                                placeholder="Write feedback..."
                                value={grades[s.id]?.feedback || ""}
                                onChange={(e) => setGrades({
                                  ...grades,
                                  [s.id]: { ...grades[s.id], feedback: e.target.value }
                                })}
                                className="bg-muted border-border"
                              />
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => gradeSubmission(s.id)}
                            disabled={grading === s.id}
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            {grading === s.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Submit Grade
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {graded.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-xl text-foreground">Graded ({graded.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {graded.map((s) => (
                        <Card key={s.id} className="bg-card border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="font-medium text-foreground">{s.student_name}</span>
                              </div>
                              <span className="text-xl font-bold text-accent">
                                {s.score}/{s.max_score}
                              </span>
                            </div>
                            {s.teacher_feedback && (
                              <p className="text-sm text-muted-foreground mt-2">{s.teacher_feedback}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
