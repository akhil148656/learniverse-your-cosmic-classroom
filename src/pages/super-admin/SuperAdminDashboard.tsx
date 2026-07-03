import { useState, useEffect } from "react";
import { Building, Users, BookOpen, CreditCard, Loader2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlobalStats {
  totalSchools: number;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
}

interface SchoolItem {
  id: string;
  name: string;
  school_code: string;
  created_at: string;
  student_count?: number;
  class_count?: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats>({
    totalSchools: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        // 1. Fetch counts
        const [schoolsRes, classesRes, studentsRes, teachersRes] = await Promise.all([
          supabase.from("schools").select("id, name, school_code, created_at"),
          supabase.from("classes").select("id", { count: "exact", head: true }),
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        ]);

        if (schoolsRes.error) throw schoolsRes.error;

        const schoolList = (schoolsRes.data || []) as SchoolItem[];

        // 2. Fetch all students & classes to group counts by school
        const [allStudents, allClasses] = await Promise.all([
          supabase.from("students").select("school_id"),
          supabase.from("classes").select("school_id"),
        ]);

        const studentCounts = new Map<string, number>();
        (allStudents.data || []).forEach((s) => {
          if (s.school_id) {
            studentCounts.set(s.school_id, (studentCounts.get(s.school_id) || 0) + 1);
          }
        });

        const classCounts = new Map<string, number>();
        (allClasses.data || []).forEach((c) => {
          if (c.school_id) {
            classCounts.set(c.school_id, (classCounts.get(c.school_id) || 0) + 1);
          }
        });

        const enrichedSchools = schoolList.map((school) => ({
          ...school,
          student_count: studentCounts.get(school.id) || 0,
          class_count: classCounts.get(school.id) || 0,
        }));

        setSchools(enrichedSchools);
        setStats({
          totalSchools: schoolList.length,
          totalClasses: classesRes.count || 0,
          totalStudents: studentsRes.count || 0,
          totalTeachers: teachersRes.count || 0,
        });
      } catch (err) {
        console.error("Error fetching super admin stats:", err);
        toast.error("Failed to load global platform stats");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  if (isLoading) {
    return (
      <PortalLayout role="super_admin">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-display animate-pulse">Initializing Master Console...</span>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout role="super_admin">
      <div className="space-y-6 super-admin-portal-theme">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Global Control Desk</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform Master Authority Dashboard</p>
        </div>

        {/* Global stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Tenants</CardTitle>
              <Building className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalSchools}</div>
              <p className="text-xs text-muted-foreground mt-1">Active school systems</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classrooms Mapped</CardTitle>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">Platform-wide classes</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enrolled Learners</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">Global student population</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform Educators</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalTeachers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active teacher accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* School tenants list */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              Registered School Systems
            </CardTitle>
            <CardDescription>Directory of schools hosted on the Learniverse platform.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {schools.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm italic font-display">
                No school tenants registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">School Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">School Code</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Classes count</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Students count</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          {school.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary py-3.5">
                          {school.school_code}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {school.class_count} classes
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {school.student_count} students
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3.5">
                          {new Date(school.created_at).toLocaleDateString()}
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
