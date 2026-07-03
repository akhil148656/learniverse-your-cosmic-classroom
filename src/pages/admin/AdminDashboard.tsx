import { useState, useEffect } from "react";
import { Building, Users, BookOpen, CreditCard, Loader2, ArrowUpRight, Copy } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardStats {
  schoolName: string;
  schoolCode: string;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  totalOutstandingFees: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    schoolName: "Loading School...",
    schoolCode: "",
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalOutstandingFees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get Admin's school_id and school details
        const { data: adminProfile, error: profileError } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw profileError;

        if (!adminProfile.school_id) {
          toast.error("You are not associated with any school. Please onboard.");
          setIsLoading(false);
          return;
        }

        const schoolId = adminProfile.school_id;

        // 2. Fetch school information
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("name, school_code")
          .eq("id", schoolId)
          .single();

        if (schoolError) throw schoolError;

        // 3. Fetch counts in parallel
        const [classesRes, studentsRes, teachersRes, billsRes] = await Promise.all([
          supabase
            .from("classes")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("role", "teacher"),
          supabase
            .from("fee_bills")
            .select("amount")
            .eq("school_id", schoolId)
            .eq("status", "pending"),
        ]);

        const pendingBillsAmount = (billsRes.data || []).reduce((acc, b) => acc + Number(b.amount || 0), 0);

        setStats({
          schoolName: schoolData.name,
          schoolCode: schoolData.school_code,
          totalClasses: classesRes.count || 0,
          totalStudents: studentsRes.count || 0,
          totalTeachers: teachersRes.count || 0,
          totalOutstandingFees: pendingBillsAmount,
        });
      } catch (err) {
        console.error("Error loading admin stats:", err);
        toast.error("Failed to load school statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const copySchoolCode = () => {
    navigator.clipboard.writeText(stats.schoolCode);
    toast.success("School Code copied to clipboard!");
  };

  if (isLoading) {
    return (
      <PortalLayout role="admin">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-display animate-pulse">Accessing Campus Database...</span>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout role="admin">
      <div className="space-y-6 admin-portal-theme">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/30 pb-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground flex items-center gap-2">
              <Building className="w-8 h-8 text-primary" />
              {stats.schoolName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Management Administration Console</p>
          </div>

          <div
            onClick={copySchoolCode}
            className="flex items-center gap-2 bg-card/60 border border-border px-3 py-1.5 rounded-lg cursor-pointer hover:border-primary/50 transition-colors self-start sm:self-auto"
          >
            <span className="text-xs font-semibold text-muted-foreground">School Code:</span>
            <span className="font-mono text-sm font-bold text-primary">{stats.schoolCode}</span>
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Active Classrooms</CardTitle>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">Schedules & courses mapped</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Enrolled Students</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered learner roster</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Active Educators</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{stats.totalTeachers}</div>
              <p className="text-xs text-muted-foreground mt-1">Teaching staff registry</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-colors card-3d">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Pending Bills</CardTitle>
              <CreditCard className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-gradient">${stats.totalOutstandingFees.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding dues balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Informational Guidelines Card */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40">
          <CardHeader>
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              Quick Admin Actions
            </CardTitle>
            <CardDescription>Administrative steps to manage your campus directory.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 p-4 rounded-xl border border-border/40 bg-card/20">
              <h3 className="font-bold text-sm text-foreground">1. Classes & Roster</h3>
              <p className="text-xs text-muted-foreground">
                Set up classrooms under Class Registry. Assign main teachers and verify student code counts.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-xl border border-border/40 bg-card/20">
              <h3 className="font-bold text-sm text-foreground">2. Scheduling periods</h3>
              <p className="text-xs text-muted-foreground">
                Build conflict-free school period timetables under Timetable Master for classes and classrooms.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-xl border border-border/40 bg-card/20">
              <h3 className="font-bold text-sm text-foreground">3. Financial Dues</h3>
              <p className="text-xs text-muted-foreground">
                Generate student tuition invoices or activity fees in bulk for entire classrooms under Billing Center.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
