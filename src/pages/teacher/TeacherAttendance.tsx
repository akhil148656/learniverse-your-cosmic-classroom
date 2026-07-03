import { useState, useEffect, useCallback } from "react";
import { Users, Calendar, ClipboardCheck, Loader2, Save } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StudentData {
  id: string;
  user_id: string;
  student_code: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface ClassData {
  id: string;
  name: string;
}

interface AttendanceStatusMap {
  [studentId: string]: "present" | "absent" | "late";
}

export default function TeacherAttendance() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<AttendanceStatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        toast.error("Failed to load classes");
        return;
      }
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      }
    };
    fetchClasses();
  }, []);

  // Fetch students & attendance records
  const fetchClassAttendance = useCallback(async () => {
    if (!selectedClass) return;
    setIsLoading(true);

    try {
      // 1. Fetch Students in class
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, student_code")
        .eq("class_id", selectedClass);

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setAttendance({});
        setIsLoading(false);
        return;
      }

      // 2. Fetch Profiles for student names
      const userIds = studentsData.map((s) => s.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.user_id, p])
      );

      const enrichedStudents = studentsData.map((s) => ({
        ...s,
        profile: profilesMap.get(s.user_id) || { full_name: "Unknown Learner", email: "" },
      }));
      setStudents(enrichedStudents);

      // 3. Fetch existing Attendance for date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("class_id", selectedClass)
        .eq("date", selectedDate);

      if (attendanceError) throw attendanceError;

      const initialAttendance: AttendanceStatusMap = {};
      // Default all to 'present' initially, then override with loaded DB state
      enrichedStudents.forEach((student) => {
        initialAttendance[student.id] = "present";
      });
      (attendanceData || []).forEach((record) => {
        initialAttendance[record.student_id] = record.status as any;
      });

      setAttendance(initialAttendance);
    } catch (error) {
      console.error("Error loading attendance:", error);
      toast.error("Failed to load attendance ledger");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    fetchClassAttendance();
  }, [fetchClassAttendance]);

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || students.length === 0) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      // Prepare records for upserting
      const upsertData = students.map((student) => ({
        student_id: student.id,
        class_id: selectedClass,
        date: selectedDate,
        status: attendance[student.id] || "present",
        marked_by: user.id,
      }));

      const { error } = await supabase
        .from("attendance_records")
        .upsert(upsertData, { onConflict: "student_id, date" });

      if (error) throw error;

      toast.success("Attendance register saved successfully!");
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast.error(error.message || "Failed to save attendance register");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Attendance Register</h1>
              <p className="text-sm text-muted-foreground">Mark daily student check-ins and absences</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div className="w-48">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-card/50 backdrop-blur-xl border-border">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-2xl border-border">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border rounded-lg px-3 py-1.5 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-foreground outline-none border-none text-sm w-32 dark:[color-scheme:dark]"
              />
            </div>

            {/* Save Button */}
            {students.length > 0 && (
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Roster
              </Button>
            )}
          </div>
        </div>

        {/* Attendance Ledger */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Roster Checklist
            </CardTitle>
            <CardDescription>
              Select Present, Absent, or Late status for each learner. Remember to save changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Scanning Roster...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Students Enrolled"
                  description="Share your class code so students can join this classroom."
                  icon={Users}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">Student Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Student Code</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Email Address</TableHead>
                      <TableHead className="font-semibold text-foreground font-display text-center py-4">Status Register</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3">
                          {student.profile?.full_name || "Unknown Student"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs py-3">
                          {student.student_code}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3">
                          {student.profile?.email || "N/A"}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <div className="inline-flex rounded-lg border border-border/50 p-0.5 bg-card/60 backdrop-blur-md">
                            <button
                              onClick={() => handleStatusChange(student.id, "present")}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                attendance[student.id] === "present"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, "absent")}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                attendance[student.id] === "absent"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, "late")}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                attendance[student.id] === "late"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Late
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
