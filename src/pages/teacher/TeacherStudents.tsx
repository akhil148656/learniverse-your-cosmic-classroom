import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Trophy, Brain, Search, UserPlus, Copy, Plus, Sparkles, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAIChat } from "@/hooks/useAIChat";
import { Label } from "@/components/ui/label";

interface StudentData {
  id: string;
  user_id: string;
  student_code?: string;
  xp_points: number | null;
  focus_score: number | null;
  grade_level: number | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  analytics?: {
    topics_completed: number;
    quizzes_passed: number;
  };
}

interface ClassData {
  id: string;
  name: string;
}

export default function TeacherStudents() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(searchParams.get("class") || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [addStudentCode, setAddStudentCode] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  
  // ERP Student Registry Select state
  const [registryStudents, setRegistryStudents] = useState<Array<{ id: string; student_code: string; name: string }>>([]);
  const [selectedRegistryStudentId, setSelectedRegistryStudentId] = useState("");
  const [teacherSchoolId, setTeacherSchoolId] = useState<string | null>(null);

  // AI Report Card states
  const { sendMessage } = useAIChat();
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [isGeneratingReportCard, setIsGeneratingReportCard] = useState(false);
  const [isPublishingReportCard, setIsPublishingReportCard] = useState(false);
  const [reportCardText, setReportCardText] = useState("");

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase.from("students").select("*");

    if (selectedClass !== "all") {
      query = query.eq("class_id", selectedClass);
    } else {
      const classIds = classes.map((c) => c.id);
      if (classIds.length > 0) {
        query = query.in("class_id", classIds);
      }
    }

    const { data: studentsData, error: studentsError } = await query;

    if (studentsError) {
      console.error("Error loading students:", studentsError);
      toast.error("Failed to load students");
      setStudents([]);
      setIsLoading(false);
      return;
    }

    if (!studentsData || studentsData.length === 0) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set(
        studentsData
          .map((s) => s.user_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const studentIds = studentsData.map((s) => s.id);

    const [profilesRes, analyticsRes] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds)
        : Promise.resolve({ data: [], error: null } as any),
      studentIds.length
        ? supabase
            .from("student_analytics")
            .select("student_id, topics_completed, quizzes_passed")
            .in("student_id", studentIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (profilesRes.error) {
      console.error("Error loading student profiles:", profilesRes.error);
      toast.error("Can't load student names (profile access blocked)");
    }
    if (analyticsRes.error) {
      console.error("Error loading student analytics:", analyticsRes.error);
    }

    const profilesByUserId = new Map<string, { full_name: string | null; email: string | null }>(
      (profilesRes.data || []).map((p: any) => [p.user_id as string, { full_name: p.full_name ?? null, email: p.email ?? null }])
    );
    const analyticsByStudentId = new Map<string, { topics_completed: number; quizzes_passed: number }>(
      (analyticsRes.data || []).map((a: any) => [
        a.student_id as string,
        {
          topics_completed: Number(a.topics_completed ?? 0),
          quizzes_passed: Number(a.quizzes_passed ?? 0),
        },
      ])
    );

    const enrichedStudents = studentsData.map((student) => {
      const profile = profilesByUserId.get(student.user_id) ?? { full_name: null, email: null };
      const analytics = analyticsByStudentId.get(student.id) ?? { topics_completed: 0, quizzes_passed: 0 };
      return { ...student, profile, analytics };
    });

    setStudents(enrichedStudents);

    setIsLoading(false);
  }, [classes, selectedClass]);

  const fetchRegistryStudents = useCallback(async (schoolId: string) => {
    try {
      const { data: studentsData, error: studentError } = await supabase
        .from("students")
        .select("id, student_code, user_id")
        .eq("school_id", schoolId)
        .is("class_id", null);

      if (studentError) throw studentError;

      if (!studentsData || studentsData.length === 0) {
        setRegistryStudents([]);
        return;
      }

      const userIds = studentsData.map((s) => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profilesMap = new Map((profilesData || []).map((p) => [p.user_id, p.full_name]));

      const enriched = studentsData.map((s) => ({
        id: s.id,
        student_code: s.student_code,
        name: profilesMap.get(s.user_id) || "Student",
      }));
      setRegistryStudents(enriched);
      if (enriched.length > 0) {
        setSelectedRegistryStudentId(enriched[0].id);
      }
    } catch (err) {
      console.error("Error fetching registry:", err);
    }
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, school_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.school_id) {
        setTeacherSchoolId(profile.school_id);
        fetchRegistryStudents(profile.school_id);
      }

      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .order("name", { ascending: true });

      setClasses(data || []);
    };

    fetchClasses();
  }, [fetchRegistryStudents]);

  useEffect(() => {
    if (classes.length > 0 || selectedClass === "all") {
      fetchStudents();
    }
  }, [fetchStudents, selectedClass, classes.length]);

  useEffect(() => {
    // If a teacher has this page open while a student joins, refresh automatically.
    const classIds = classes.map((c) => c.id).filter(Boolean);
    if (classIds.length === 0) return;

    const channels = classIds.map((classId) =>
      supabase
        .channel(`teacher-students-${classId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
            filter: `class_id=eq.${classId}`,
          },
          () => {
            fetchStudents();
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [classes, fetchStudents]);

  const filteredStudents = students.filter((s) =>
    (s.profile?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (s.profile?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const addStudentToSelectedClass = async () => {
    if (selectedClass === "all") {
      toast.error("Select a class first");
      return;
    }
    if (!addStudentCode.trim()) {
      toast.error("Enter a student ID");
      return;
    }

    setIsAddingStudent(true);
    try {
      const { error } = await supabase.rpc("teacher_add_student_to_class_by_code", {
        _class_id: selectedClass,
        _student_code: addStudentCode.trim().toUpperCase(),
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Student added to class");
      setAddStudentCode("");

      await fetchStudents();
      if (teacherSchoolId) {
        fetchRegistryStudents(teacherSchoolId);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const enrollRegistryStudent = async () => {
    if (selectedClass === "all" || !selectedRegistryStudentId) return;
    setIsAddingStudent(true);

    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: selectedClass })
        .eq("id", selectedRegistryStudentId);

      if (error) throw error;

      toast.success("Student enrolled from school registry!");
      setSelectedRegistryStudentId("");
      fetchStudents();
      if (teacherSchoolId) {
        fetchRegistryStudents(teacherSchoolId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll student");
    } finally {
      setIsAddingStudent(false);
    }
  };


  const addAchievement = async (studentId: string, studentName: string) => {
    const title = window.prompt(`Add an achievement for ${studentName}:`, "")?.trim();
    if (!title) return;

    const description = window.prompt("Optional: Add a short description:", "")?.trim();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        return;
      }

      const { error } = await supabase
        .from("student_achievements")
        .insert({
          student_id: studentId,
          teacher_id: user.id,
          title,
          description: description || null,
        });

      if (error) {
        const msg = error.message || "Failed to add achievement";
        const missingTable =
          msg.toLowerCase().includes("student_achievements") &&
          msg.toLowerCase().includes("schema cache");
        toast.error(
          missingTable
            ? "Achievements table is not deployed yet. Run Supabase migrations, then try again."
            : msg
        );
        return;
      }

      toast.success("Achievement added");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to add achievement");
    }
  };

  const handleOpenReportCardDialog = async (student: StudentData) => {
    setSelectedStudent(student);
    setReportCardText("");
    setIsReportCardOpen(true);
    
    try {
      const { data } = await supabase
        .from("ai_feedback")
        .select("feedback_text")
        .eq("student_id", student.id)
        .eq("category", "report_card")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.feedback_text) {
        setReportCardText(data.feedback_text);
      }
    } catch (err) {
      console.error("Failed to load existing report card:", err);
    }
  };

  const handleGenerateAIReportCard = async () => {
    if (!selectedStudent) return;
    setIsGeneratingReportCard(true);

    try {
      const prompt = `You are a Cosmic Learning Coach. Generate a formal academic report card evaluation for a student with the following metrics:
Name: ${selectedStudent.profile?.full_name || "Student"}
XP Points: ${selectedStudent.xp_points || 0}
Focus Score: ${selectedStudent.focus_score || 100}%
Topics Completed: ${selectedStudent.analytics?.topics_completed || 0}
Quizzes Passed: ${selectedStudent.analytics?.quizzes_passed || 0}
Grade Level: ${selectedStudent.grade_level || "N/A"}

Please write a highly professional, encouraging, cosmic-themed evaluation. Use this structure:
# Galactic Academic Summary
[1 paragraph summarizing their overall performance and learning attitude]

# Cognitive Strengths
[2-3 bullet points detailing subjects/skills they excelled in based on their XP and focus]

# Growth Spheres
[2-3 bullet points suggesting areas for development and focus]

# Astral Recommendations
[1 paragraph with concrete advice on study time, quizzes, or subjects to explore]

Keep it clean, do not use HTML tags, and make sure it has exactly those 4 section headings.`;

      const response = await sendMessage(prompt, "chat");
      if (response) {
        setReportCardText(response.trim());
        toast.success("AI Cosmic Report Card generated successfully!");
      } else {
        toast.error("Failed to generate report card text");
      }
    } catch (err) {
      console.error("AI report card generation failed:", err);
      toast.error("Failed to connect to AI server. Please try again.");
    } finally {
      setIsGeneratingReportCard(false);
    }
  };

  const handlePublishReportCard = async () => {
    if (!selectedStudent || !reportCardText.trim()) {
      toast.error("Report card text cannot be empty");
      return;
    }
    setIsPublishingReportCard(true);

    try {
      const { error } = await supabase
        .from("ai_feedback")
        .insert({
          student_id: selectedStudent.id,
          category: "report_card",
          feedback_text: reportCardText.trim(),
          parent_acknowledged: false,
          teacher_acknowledged: true
        } as any);

      if (error) {
        throw error;
      }
      toast.success("Report card published successfully!");
      setIsReportCardOpen(false);
    } catch (err) {
      console.error("Failed to publish report card:", err);
      // Fallback
      toast.success("Report card saved locally (offline mode)!");
      const localKey = `learniverse_local_report_cards_${selectedStudent.id}`;
      localStorage.setItem(localKey, reportCardText.trim());
      setIsReportCardOpen(false);
    } finally {
      setIsPublishingReportCard(false);
    }
  };

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">View and manage your students</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted border-border"
            />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px] bg-muted border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClass !== "all" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Invite Student by Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3 flex-wrap">
                <Input
                  placeholder="Enter Student ID (e.g., STU-XXXXXXXXXX)"
                  value={addStudentCode}
                  onChange={(e) => setAddStudentCode(e.target.value)}
                  className="bg-muted border-border flex-1 min-w-[240px]"
                />
                <Button
                  onClick={addStudentToSelectedClass}
                  disabled={isAddingStudent}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isAddingStudent ? "Adding..." : "Add"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Enroll from School Registry
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3 flex-wrap">
                {registryStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic">
                    No unregistered students currently in your school ledger.
                  </p>
                ) : (
                  <>
                    <div className="flex-1 min-w-[240px]">
                      <Select
                        value={selectedRegistryStudentId}
                        onValueChange={setSelectedRegistryStudentId}
                      >
                        <SelectTrigger className="bg-muted border-border w-full">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {registryStudents.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.student_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={enrollRegistryStudent}
                      disabled={isAddingStudent || !selectedRegistryStudentId}
                      className="bg-secondary hover:opacity-90 text-secondary-foreground"
                    >
                      {isAddingStudent ? "Enrolling..." : "Enroll"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Student List ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                title="No students found"
                message={selectedClass === "all" ? "Students will appear when they join your classes" : "No students in this class yet"}
                icon={Users}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Student ID</TableHead>
                    <TableHead className="text-muted-foreground">Grade</TableHead>
                    <TableHead className="text-muted-foreground">XP</TableHead>
                    <TableHead className="text-muted-foreground">Focus</TableHead>
                    <TableHead className="text-muted-foreground">Topics</TableHead>
                    <TableHead className="text-muted-foreground">Quizzes</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Achievements</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Report Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {student.profile?.full_name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.profile?.email || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.student_code ? (
                          <button
                            className="inline-flex items-center gap-2 hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(student.student_code!);
                              toast.success("Student ID copied");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                            <span className="font-mono text-xs">{student.student_code}</span>
                          </button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.grade_level || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-accent">
                          <Trophy className="w-4 h-4" />
                          {student.xp_points || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-secondary">
                          <Brain className="w-4 h-4" />
                          {student.focus_score || 100}%
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.analytics?.topics_completed || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.analytics?.quizzes_passed || 0}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => addAchievement(student.id, student.profile?.full_name || "this student")}
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-secondary/40 text-secondary hover:bg-secondary/10"
                          onClick={() => handleOpenReportCardDialog(student)}
                        >
                          <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                          Evaluate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* AI Report Card Dialog */}
        <Dialog open={isReportCardOpen} onOpenChange={setIsReportCardOpen}>
          <DialogContent className="max-w-2xl bg-card border-border shadow-[0_0_40px_rgba(139,92,246,0.25)] text-foreground">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                AI Cosmic Report Card
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Review and generate a detailed academic report card for {selectedStudent?.profile?.full_name || "student"}.
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-4 py-2">
                {/* Stats grid overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 border border-border/40 p-3 rounded-lg">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">XP Points</p>
                    <p className="text-sm font-bold text-accent">{selectedStudent.xp_points || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider font-semibold">Focus Score</p>
                    <p className="text-sm font-bold text-secondary">{selectedStudent.focus_score || 100}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Topics</p>
                    <p className="text-sm font-bold text-primary">{selectedStudent.analytics?.topics_completed || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Quizzes Passed</p>
                    <p className="text-sm font-bold text-accent">{selectedStudent.analytics?.quizzes_passed || 0}</p>
                  </div>
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerateAIReportCard}
                  disabled={isGeneratingReportCard}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-display text-xs uppercase tracking-widest h-9 glow-primary"
                >
                  {isGeneratingReportCard ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Consulting Astral Coach...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with Cosmic AI
                    </>
                  )}
                </Button>

                {/* Report Card content preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Report Card Evaluation</Label>
                  <Textarea
                    id="report-card-content"
                    placeholder="Cosmic feedback text will appear here. You can edit this text freely before publishing to parent."
                    value={reportCardText}
                    onChange={(e) => setReportCardText(e.target.value)}
                    className="min-h-[220px] bg-input border-border text-sm text-foreground focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border/50 pt-4 mt-2">
              <Button
                variant="outline"
                onClick={() => setIsReportCardOpen(false)}
                className="border-border text-foreground hover:bg-muted font-display text-xs uppercase tracking-wider h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublishReportCard}
                disabled={isPublishingReportCard || !reportCardText.trim()}
                className="bg-secondary hover:bg-secondary/90 text-background font-display font-extrabold text-xs uppercase tracking-widest h-9 border border-secondary/20 glow-secondary"
              >
                {isPublishingReportCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    Publish to Parent
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
