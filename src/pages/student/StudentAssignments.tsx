import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, Send, Loader2, Users } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignmentData {
  id: string;
  status: string;
  submission_text: string | null;
  submission_attachment_path?: string | null;
  submission_attachment_name?: string | null;
  score: number | null;
  teacher_feedback: string | null;
  submitted_at: string | null;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    max_score: number | null;
    class_id: string | null;
  };
  class_name?: string;
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submissionFile, setSubmissionFile] = useState<Record<string, File | null>>({});
  const [studentClassId, setStudentClassId] = useState<string | null>(null);

  const SUBMISSIONS_BUCKET = "assignment-submissions";

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

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!student) {
      setIsLoading(false);
      return;
    }

    setStudentClassId(student.class_id);

    // Fetch class name if student has a class
    let className = null;
    if (student.class_id) {
      const { data: classData } = await supabase
        .from("classes")
        .select("name")
        .eq("id", student.class_id)
        .maybeSingle();
      className = classData?.name;
    }

    const { data } = await supabase
      .from("student_assignments")
      .select("*, assignments(*)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        status: d.status,
        submission_text: d.submission_text,
        submission_attachment_path: d.submission_attachment_path,
        submission_attachment_name: d.submission_attachment_name,
        score: d.score,
        teacher_feedback: d.teacher_feedback,
        submitted_at: d.submitted_at,
        assignment: d.assignments,
        class_name: className,
      }));
      setAssignments(formatted);
    }
    setIsLoading(false);
  };

  const submitAssignment = async (studentAssignmentId: string) => {
    const text = submissionText[studentAssignmentId];
    const file = submissionFile[studentAssignmentId] || null;
    if (!text?.trim() && !file) {
      toast.error("Add a message or attach a file");
      return;
    }

    setSubmitting(studentAssignmentId);
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMime: string | null = null;

    if (file) {
      attachmentName = file.name;
      attachmentMime = file.type || null;
      attachmentPath = `${studentAssignmentId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(SUBMISSIONS_BUCKET)
        // We generate a unique filename, so we don't need upsert (and it can require extra UPDATE privileges).
        .upload(attachmentPath, file, { upsert: false, contentType: file.type || undefined });

      if (uploadError) {
        console.error("Upload failed", uploadError);
        const details =
          (uploadError as any)?.message ||
          (uploadError as any)?.error_description ||
          (uploadError as any)?.statusCode ||
          "Unknown error";
        toast.error(`Failed to upload attachment: ${details}`);
        setSubmitting(null);
        return;
      }
    }

    const { error } = await supabase
      .from("student_assignments")
      .update({
        submission_text: text,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submission_attachment_path: attachmentPath,
        submission_attachment_name: attachmentName,
        submission_attachment_mime: attachmentMime,
      })
      .eq("id", studentAssignmentId);

    if (error) {
      const msg = error.message || "Failed to submit assignment";
      console.error("Submit assignment failed", error);
      toast.error(msg);
    } else {
      toast.success("Assignment submitted!");
      setSubmissionFile((prev) => ({ ...prev, [studentAssignmentId]: null }));
      fetchAssignments();
    }
    setSubmitting(null);
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const submitted = assignments.filter((a) => a.status === "submitted");
  const graded = assignments.filter((a) => a.status === "reviewed");

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderAssignment = (a: AssignmentData, showSubmit: boolean = false) => (
    <Card key={a.id} className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg text-foreground">{a.assignment.title}</CardTitle>
            {a.class_name && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{a.class_name}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">{a.assignment.description || "No description"}</p>
          </div>
          {a.assignment.due_date && (
            <Badge variant={isOverdue(a.assignment.due_date) && a.status === "pending" ? "destructive" : "outline"}>
              <Clock className="w-3 h-3 mr-1" />
              {new Date(a.assignment.due_date).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSubmit && (
          <>
            <Textarea
              placeholder="Write your submission here..."
              value={submissionText[a.id] || ""}
              onChange={(e) => setSubmissionText({ ...submissionText, [a.id]: e.target.value })}
              className="bg-muted border-border min-h-[120px]"
            />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Attachment (optional)</p>
              <input
                type="file"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80"
                onChange={(e) =>
                  setSubmissionFile({
                    ...submissionFile,
                    [a.id]: e.target.files?.[0] || null,
                  })
                }
              />
              {submissionFile[a.id]?.name && (
                <p className="text-xs text-muted-foreground truncate">Selected: {submissionFile[a.id]!.name}</p>
              )}
            </div>

            <Button
              onClick={() => submitAssignment(a.id)}
              disabled={submitting === a.id}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {submitting === a.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Assignment
            </Button>
          </>
        )}

        {a.status === "submitted" && (
          <div className="flex items-center gap-2 text-accent">
            <CheckCircle className="w-5 h-5" />
            <span>Submitted on {new Date(a.submitted_at!).toLocaleDateString()}</span>
          </div>
        )}

        {a.submission_attachment_path && (
          <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
            <div className="text-sm text-muted-foreground truncate">
              Attachment: <span className="text-foreground">{a.submission_attachment_name || "file"}</span>
            </div>
            <Button variant="outline" onClick={() => openAttachment(a.submission_attachment_path!)}>
              View
            </Button>
          </div>
        )}

        {a.status === "reviewed" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Score:</span>
              <span className="text-2xl font-bold text-accent">
                {a.score}/{a.assignment.max_score}
              </span>
            </div>
            {a.teacher_feedback && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground font-medium mb-1">Teacher Feedback:</p>
                <p className="text-sm text-foreground">{a.teacher_feedback}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground">
            {studentClassId 
              ? "Complete assignments from your class" 
              : "Join a class to receive assignments"}
          </p>
        </div>

        {!studentClassId && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">No class joined</p>
                <p className="text-sm text-muted-foreground">
                  Join a class using a class code to receive assignments from your teacher.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            message={studentClassId ? "Assignments from your teacher will appear here" : "Join a class to see assignments"}
            icon={FileText}
          />
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="bg-muted">
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
              <TabsTrigger value="graded">Graded ({graded.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {pending.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending assignments</p>
              ) : (
                pending.map((a) => renderAssignment(a, true))
              )}
            </TabsContent>

            <TabsContent value="submitted" className="space-y-4 mt-4">
              {submitted.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted assignments</p>
              ) : (
                submitted.map((a) => renderAssignment(a))
              )}
            </TabsContent>

            <TabsContent value="graded" className="space-y-4 mt-4">
              {graded.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No graded assignments</p>
              ) : (
                graded.map((a) => renderAssignment(a))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PortalLayout>
  );
}
