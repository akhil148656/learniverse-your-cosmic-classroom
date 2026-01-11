import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, Send, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignmentData {
  id: string;
  status: string;
  submission_text: string | null;
  score: number | null;
  teacher_feedback: string | null;
  submitted_at: string | null;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    max_score: number | null;
  };
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      setIsLoading(false);
      return;
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
        score: d.score,
        teacher_feedback: d.teacher_feedback,
        submitted_at: d.submitted_at,
        assignment: d.assignments,
      }));
      setAssignments(formatted);
    }
    setIsLoading(false);
  };

  const submitAssignment = async (studentAssignmentId: string) => {
    const text = submissionText[studentAssignmentId];
    if (!text?.trim()) {
      toast.error("Please enter your submission");
      return;
    }

    setSubmitting(studentAssignmentId);
    const { error } = await supabase
      .from("student_assignments")
      .update({
        submission_text: text,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", studentAssignmentId);

    if (error) {
      toast.error("Failed to submit assignment");
    } else {
      toast.success("Assignment submitted!");
      fetchAssignments();
    }
    setSubmitting(null);
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const submitted = assignments.filter((a) => a.status === "submitted");
  const graded = assignments.filter((a) => a.status === "graded");

  const renderAssignment = (a: AssignmentData, showSubmit: boolean = false) => (
    <Card key={a.id} className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-display text-lg text-foreground">{a.assignment.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{a.assignment.description || "No description"}</p>
          </div>
          {a.assignment.due_date && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {new Date(a.assignment.due_date).toLocaleDateString()}
            </div>
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

        {a.status === "graded" && (
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
          <p className="text-muted-foreground">Complete assignments from your teacher</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            message="Assignments from your teacher will appear here"
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
