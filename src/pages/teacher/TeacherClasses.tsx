import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Users, BookOpen, Trash2, Link2, UserPlus } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  class_code: string;
  description: string | null;
  grade_level: number | null;
  student_count?: number;
}

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", description: "", grade_level: "6" });

  const [addStudentForClassId, setAddStudentForClassId] = useState<string | null>(null);
  const [addStudentCode, setAddStudentCode] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error fetching user:", userError);
      toast.error(userError?.message || "Not logged in");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching classes:", error);
      toast.error(`Could not load classes: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // Get student counts for each class; if a count fails, keep zero but log it
    const classesWithCounts = await Promise.all(
      (data || []).map(async (cls) => {
        const { count, error: countError } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("class_id", cls.id);
        if (countError) {
          console.error("Error counting students for class", cls.id, countError);
        }
        return { ...cls, student_count: count || 0 };
      })
    );

    setClasses(classesWithCounts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const generateRandomClassCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateClass = async () => {
    if (!newClass.name.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        setIsCreating(false);
        return;
      }

      // Under RLS a teacher cannot SELECT other teachers' classes,
      // so we ensure uniqueness by retrying insert if the unique constraint hits.
      let createdCode: string | null = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < 10; attempt++) {
        const classCode = generateRandomClassCode();
        const { error } = await supabase.from("classes").insert({
          name: newClass.name,
          description: newClass.description || null,
          grade_level: parseInt(newClass.grade_level),
          class_code: classCode,
          teacher_id: user.id,
        });

        if (!error) {
          createdCode = classCode;
          break;
        }

        lastError = error;
        const isUniqueViolation = (error as any)?.code === "23505";
        if (!isUniqueViolation) break;
      }

      if (!createdCode) {
        console.error("Error creating class:", lastError);
        toast.error(`Failed to create class: ${lastError?.message || "Unknown error"}`);
        return;
      }

      toast.success(`Class created! Code: ${createdCode}`);
      setDialogOpen(false);
      setNewClass({ name: "", description: "", grade_level: "6" });
      await fetchClasses(); // Refresh immediately
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create class");
    } finally {
      setIsCreating(false);
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Class code copied!");
  };

  const getClassLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}/student/onboarding?class=${code}` : "";
  };

  const copyClassLink = (code: string) => {
    const link = getClassLink(code);
    if (!link) {
      toast.error("Unable to build class link");
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success("Class link copied!");
  };

  const deleteClass = async (classId: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", classId);
    if (error) {
      toast.error("Failed to delete class");
    } else {
      toast.success("Class deleted");
      fetchClasses();
    }
  };

  const addStudentToClassByCode = async () => {
    if (!addStudentForClassId) return;
    if (!addStudentCode.trim()) {
      toast.error("Enter a student ID");
      return;
    }

    setIsAddingStudent(true);
    try {
      const { error } = await supabase.rpc("teacher_add_student_to_class_by_code", {
        _class_id: addStudentForClassId,
        _student_code: addStudentCode.trim().toUpperCase(),
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Student added to class");
      setAddStudentCode("");
      setAddStudentForClassId(null);
      await fetchClasses();
    } finally {
      setIsAddingStudent(false);
    }
  };

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Classes</h1>
            <p className="text-muted-foreground">Manage your classes and students</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Class Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., 10th Grade Science"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select
                    value={newClass.grade_level}
                    onValueChange={(v) => setNewClass({ ...newClass, grade_level: v })}
                  >
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateClass} disabled={isCreating} className="w-full bg-primary hover:bg-primary/90">
                  {isCreating ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={!!addStudentForClassId} onOpenChange={(open) => { if (!open) setAddStudentForClassId(null); }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Student by ID
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Label htmlFor="student-code">Student ID</Label>
              <Input
                id="student-code"
                placeholder="e.g., STU-XXXXXXXXXX"
                value={addStudentCode}
                onChange={(e) => setAddStudentCode(e.target.value)}
                className="bg-muted border-border"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setAddStudentForClassId(null)}
                  disabled={isAddingStudent}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={addStudentToClassByCode}
                  disabled={isAddingStudent}
                >
                  {isAddingStudent ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="h-40" />
              </Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            message="Create your first class to get started"
            icon={BookOpen}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="bg-card border-border hover:border-primary transition-colors cursor-pointer" onClick={() => navigate(`/teacher/students?class=${cls.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-display text-lg text-foreground">{cls.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteClass(cls.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{cls.description || `Grade ${cls.grade_level}`}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{cls.student_count} students</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); copyClassCode(cls.class_code); }}
                    >
                      <Copy className="w-3 h-3" />
                      {cls.class_code}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddStudentForClassId(cls.id);
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add student by ID
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => { e.stopPropagation(); copyClassLink(cls.class_code); }}
                    >
                      <Link2 className="w-4 h-4" />
                      Copy class join link
                    </Button>
                    <p className="text-xs text-muted-foreground break-all">
                      {getClassLink(cls.class_code)}
                    </p>
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
