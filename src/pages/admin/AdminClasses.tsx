import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Loader2, Users, Clipboard } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeacherProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  grade_level: number | null;
  class_code: string;
  teacher_id: string;
  teacher_name?: string;
  student_count?: number;
}

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gradeLevel: "6",
    teacherId: "",
  });

  const fetchClassesAndTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Admin school ID
      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) return;
      const schoolId = adminProf.school_id;

      // 2. Fetch Teachers in school
      const { data: teachersData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      const teachersList = (teachersData || []) as TeacherProfile[];
      setTeachers(teachersList);
      if (teachersList.length > 0) {
        setFormData((prev) => ({ ...prev, teacherId: teachersList[0].user_id }));
      }

      // 3. Fetch Classes in school
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      if (classesError) throw classesError;

      const classesList = (classesData || []) as ClassData[];

      // 4. Fetch Student counts per class
      const { data: studentsCountData } = await supabase
        .from("students")
        .select("class_id");

      const countsMap = new Map<string, number>();
      (studentsCountData || []).forEach((student) => {
        if (student.class_id) {
          countsMap.set(student.class_id, (countsMap.get(student.class_id) || 0) + 1);
        }
      });

      const teachersMap = new Map(teachersList.map((t) => [t.user_id, t.full_name]));

      const enrichedClasses = classesList.map((cls) => ({
        ...cls,
        teacher_name: teachersMap.get(cls.teacher_id) || "Assigned Teacher",
        student_count: countsMap.get(cls.id) || 0,
      }));

      setClasses(enrichedClasses);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load school classes list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassesAndTeachers();
  }, [fetchClassesAndTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.teacherId) {
      toast.error("Class Name and Teacher Assignment are required");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      // Get school_id
      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) throw new Error("School not set");

      // Generate random 6 character class code
      const generatedClassCode = Math.random().toString(36).substr(2, 6).toUpperCase();

      const { error } = await supabase.from("classes").insert([
        {
          name: formData.name,
          description: formData.description || null,
          grade_level: Number(formData.gradeLevel),
          class_code: generatedClassCode,
          teacher_id: formData.teacherId,
          school_id: adminProf.school_id,
        },
      ]);

      if (error) throw error;

      toast.success(`Classroom "${formData.name}" established!`);
      setIsDialogOpen(false);
      setFormData((prev) => ({ ...prev, name: "", description: "" }));
      fetchClassesAndTeachers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create classroom");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Class code ${code} copied!`);
  };

  return (
    <PortalLayout role="admin">
      <div className="space-y-6 admin-portal-theme">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Class Registry</h1>
              <p className="text-sm text-muted-foreground">Manage classrooms and assign educator permissions</p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Classroom
          </Button>
        </div>

        {/* Classes Table */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Active Classroom Registries
            </CardTitle>
            <CardDescription>Directory of all registered classrooms and codes.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Accessing classes...</span>
              </div>
            ) : classes.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Classrooms Registered"
                  description="Establish a new classroom registry and assign an educator to begin."
                  icon={BookOpen}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">Class Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Assigned Educator</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Grade / Level</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Students Enrolled</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Class Join Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((cls) => (
                      <TableRow key={cls.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          <div>
                            <span className="block font-semibold">{cls.name}</span>
                            {cls.description && (
                              <span className="text-xs text-muted-foreground block truncate max-w-xs">{cls.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {cls.teacher_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          Grade {cls.grade_level}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {cls.student_count} students
                        </TableCell>
                        <TableCell className="py-3.5">
                          <button
                            onClick={() => copyClassCode(cls.class_code)}
                            className="inline-flex items-center gap-2 bg-muted/60 border border-border px-2.5 py-1 rounded font-mono text-xs font-bold text-primary hover:border-primary/40 transition-all"
                          >
                            {cls.class_code}
                            <Clipboard className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold">Create Classroom Workspace</DialogTitle>
              <DialogDescription>Add a new classroom registry and link a teacher.</DialogDescription>
            </DialogHeader>

            {teachers.length === 0 ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  No educators registered under your school code yet. Teachers must sign up using your School Code first.
                </p>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border">
                  Cancel
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Classroom Name</Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. 10th Grade Chemistry"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g. Introductory Organic Chemistry and Labs"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Grade Level */}
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select
                      value={formData.gradeLevel}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, gradeLevel: val }))}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                          <SelectItem key={g} value={g.toString()}>
                            Class {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Teacher select */}
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Assign Teacher</Label>
                    <Select
                      value={formData.teacherId}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, teacherId: val }))}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select Teacher" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {teachers.map((t) => (
                          <SelectItem key={t.user_id} value={t.user_id}>
                            {t.full_name || t.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-cosmic text-white font-medium hover:opacity-90"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Classroom"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
