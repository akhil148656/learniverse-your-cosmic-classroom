import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Mail, Trophy, Brain, Search } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";

interface StudentData {
  id: string;
  user_id: string;
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
    const fetchStudents = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("students").select("*");

      if (selectedClass !== "all") {
        query = query.eq("class_id", selectedClass);
      } else {
        // Get all students from teacher's classes
        const classIds = classes.map(c => c.id);
        if (classIds.length > 0) {
          query = query.in("class_id", classIds);
        }
      }

      const { data: studentsData } = await query;

      if (studentsData) {
        const enrichedStudents = await Promise.all(
          studentsData.map(async (student) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", student.user_id)
              .single();

            const { data: analytics } = await supabase
              .from("student_analytics")
              .select("topics_completed, quizzes_passed")
              .eq("student_id", student.id)
              .single();

            return {
              ...student,
              profile: profile || { full_name: null, email: null },
              analytics: analytics || { topics_completed: 0, quizzes_passed: 0 },
            };
          })
        );

        setStudents(enrichedStudents);
      }

      setIsLoading(false);
    };

    if (classes.length > 0 || selectedClass === "all") {
      fetchStudents();
    }
  }, [selectedClass, classes]);

  const filteredStudents = students.filter((s) =>
    (s.profile?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (s.profile?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

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
                    <TableHead className="text-muted-foreground">Grade</TableHead>
                    <TableHead className="text-muted-foreground">XP</TableHead>
                    <TableHead className="text-muted-foreground">Focus</TableHead>
                    <TableHead className="text-muted-foreground">Topics</TableHead>
                    <TableHead className="text-muted-foreground">Quizzes</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
