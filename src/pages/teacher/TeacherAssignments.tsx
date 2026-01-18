import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, Users, Trash2, Send, Loader2, CheckSquare } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  class_id: string | null;
  created_at: string;
  class_name?: string;
  submission_count?: number;
}

interface ClassData {
  id: string;
  name: string;
}

type ClassLookup = { id: string; name: string; grade_level: number | null };

export default function TeacherAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classMode, setClassMode] = useState<"my-classes" | "class-code">("my-classes");
  const [classCode, setClassCode] = useState("");
  const [classLookup, setClassLookup] = useState<ClassLookup | null>(null);
  const [isLookingUpClass, setIsLookingUpClass] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    class_id: "",
    due_date: "",
    max_score: "100",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch classes (RLS-scoped): includes owned classes + classes joined via code
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .order("created_at", { ascending: false });
    setClasses(classesData || []);

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (assignmentsData) {
      const enriched = await Promise.all(
        assignmentsData.map(async (a) => {
          const classInfo = classesData?.find((c) => c.id === a.class_id);
          const { count } = await supabase
            .from("student_assignments")
            .select("*", { count: "exact", head: true })
            .eq("assignment_id", a.id)
            .neq("status", "pending");
          return {
            ...a,
            class_name: classInfo?.name || "No class",
            submission_count: count || 0,
          };
        })
      );
      setAssignments(enriched);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (classMode !== "class-code") return;

    const code = classCode.trim().toUpperCase();
    if (code.length < 6) {
      setClassLookup(null);
      setNewAssignment((prev) => ({ ...prev, class_id: "" }));
      return;
    }

    let cancelled = false;
    setIsLookingUpClass(true);

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("find_class_by_code", { _code: code });
      if (cancelled) return;

      const cls = !error && data && data.length > 0 ? (data[0] as any) : null;
      if (cls) {
        const normalized: ClassLookup = {
          id: cls.id,
          name: cls.name,
          grade_level: cls.grade_level ?? null,
        };
        setClassLookup(normalized);
        setNewAssignment((prev) => ({ ...prev, class_id: normalized.id }));
      } else {
        setClassLookup(null);
        setNewAssignment((prev) => ({ ...prev, class_id: "" }));
      }

      setIsLookingUpClass(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsLookingUpClass(false);
    };
  }, [classMode, classCode]);

  const handleCreate = async () => {
    const targetClassId = newAssignment.class_id;
    if (!newAssignment.title.trim() || !targetClassId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If teacher is assigning via class code, ensure they are linked to that class.
    // This supports multiple teachers teaching the same class.
    if (classMode === "class-code") {
      const alreadyAccessible = classes.some((c) => c.id === targetClassId);

      const code = classCode.trim().toUpperCase();
      if (code.length < 6) {
        toast.error("Enter a 6-character class code");
        setIsCreating(false);
        return;
      }

      // Only attempt to join if this class isn't already visible to the teacher under RLS.
      if (!alreadyAccessible) {
        const { error: joinError } = await supabase.rpc("teacher_join_class_by_code", { _code: code });
        if (joinError) {
          const msg = joinError.message || "Failed to link teacher to class";
          const isMissingRpc = msg.includes("Could not find the function public.teacher_join_class_by_code");
          toast.error(
            isMissingRpc
              ? "Your Supabase database is missing the latest migrations (teacher_join_class_by_code). Run the Supabase migration push, then try again."
              : msg
          );
          setIsCreating(false);
          return;
        }
      }
    }

    const { data: assignment, error } = await supabase.from("assignments").insert({
      title: newAssignment.title,
      description: newAssignment.description || null,
      class_id: targetClassId,
      due_date: newAssignment.due_date || null,
      max_score: parseInt(newAssignment.max_score) || 100,
      teacher_id: user.id,
    }).select().single();

    if (error) {
      toast.error("Failed to create assignment");
      console.error(error);
    } else {
      // Assign to all students in the class
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", targetClassId);

      if (!students || students.length === 0) {
        toast.success("Assignment created.");
        toast.message("No students found in that class yet.");
      } else {
        const studentAssignments = students.map((s) => ({
          student_id: s.id,
          assignment_id: assignment.id,
          status: "pending",
        }));

        const { error: assignError } = await supabase
          .from("student_assignments")
          .insert(studentAssignments);

        if (assignError) {
          console.error("Failed to assign students", assignError);
          toast.error(assignError.message || "Failed to assign to students");
        } else {
          toast.success("Assignment created and sent to students!");
        }
      }
      setDialogOpen(false);
      setClassCode("");
      setClassLookup(null);
      setClassMode("my-classes");
      setNewAssignment({ title: "", description: "", class_id: "", due_date: "", max_score: "100" });
      fetchData();
    }
    setIsCreating(false);
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete assignment");
    } else {
      toast.success("Assignment deleted");
      fetchData();
    }
  };

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Assignments</h1>
            <p className="text-muted-foreground">Create and manage assignments for your classes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Assignment title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Assignment instructions..."
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    className="bg-muted border-border min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Tabs value={classMode} onValueChange={(v) => setClassMode(v as any)}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="my-classes">My classes</TabsTrigger>
                      <TabsTrigger value="class-code">By class code</TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-classes" className="mt-3">
                      <Select
                        value={newAssignment.class_id}
                        onValueChange={(v) => setNewAssignment({ ...newAssignment, class_id: v })}
                      >
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>

                    <TabsContent value="class-code" className="mt-3 space-y-2">
                      <Input
                        placeholder="ABC123"
                        value={classCode}
                        maxLength={6}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        className="bg-muted border-border text-center tracking-widest"
                      />
                      <div className="text-sm text-muted-foreground">
                        {isLookingUpClass
                          ? "Checking class code…"
                          : classLookup
                            ? `Class found: ${classLookup.name}${classLookup.grade_level ? ` (Grade ${classLookup.grade_level})` : ""}`
                            : classCode.trim().length >= 6
                              ? "Invalid class code"
                              : "Enter the 6-character code from the class"}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input
                      type="number"
                      value={newAssignment.max_score}
                      onChange={(e) => setNewAssignment({ ...newAssignment, max_score: e.target.value })}
                      className="bg-muted border-border"
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={isCreating} className="w-full bg-primary hover:bg-primary/90">
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {isCreating ? "Creating..." : "Create & Send to Students"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            message="Create your first assignment to send to students"
            icon={FileText}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((a) => (
              <Card key={a.id} className="bg-card border-border hover:border-primary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-display text-lg text-foreground">{a.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAssignment(a.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.description || "No description"}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{a.class_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-accent">
                      <FileText className="w-4 h-4" />
                      <span>{a.submission_count} submitted</span>
                    </div>
                  </div>
                  {a.due_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {(a.submission_count ?? 0) > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => navigate(`/teacher/grading?assignment=${a.id}`)}
                    >
                      <CheckSquare className="w-4 h-4" />
                      Grade Submissions
                    </Button>
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
