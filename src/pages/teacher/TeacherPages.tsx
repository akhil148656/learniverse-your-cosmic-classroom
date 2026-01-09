import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { LayoutDashboard, BookOpen, Users, FileText, BarChart3, MessageSquare } from "lucide-react";

export function TeacherDashboard() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Teacher Dashboard</h1>
        <EmptyState title="Welcome to your dashboard" message="Create classes and manage your students" icon={LayoutDashboard} />
      </div>
    </PortalLayout>
  );
}

export function TeacherClasses() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">My Classes</h1>
        <EmptyState title="No classes yet" message="Create your first class to get started" icon={BookOpen} />
      </div>
    </PortalLayout>
  );
}

export function TeacherStudents() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Students</h1>
        <EmptyState title="No students yet" message="Students will appear here when they join your class" icon={Users} />
      </div>
    </PortalLayout>
  );
}

export function TeacherAssignments() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Assignments</h1>
        <EmptyState title="No assignments yet" message="Create assignments for your students" icon={FileText} />
      </div>
    </PortalLayout>
  );
}

export function TeacherAnalytics() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
        <EmptyState title="No analytics yet" message="Analytics will appear as students engage with content" icon={BarChart3} />
      </div>
    </PortalLayout>
  );
}

export function TeacherFeedback() {
  return (
    <PortalLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Feedback</h1>
        <EmptyState title="No feedback pending" message="Review and provide feedback on student work" icon={MessageSquare} />
      </div>
    </PortalLayout>
  );
}
