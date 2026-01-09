import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { FileText, HelpCircle, FlaskConical, MessageSquare, Bot } from "lucide-react";

export function StudentAssignments() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Assignments</h1>
        <EmptyState title="No assignments yet" message="Assignments from your teacher will appear here" icon={FileText} />
      </div>
    </PortalLayout>
  );
}

export function StudentQuizzes() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Quizzes</h1>
        <EmptyState title="No quizzes available" message="Take quizzes to test your knowledge and earn XP" icon={HelpCircle} />
      </div>
    </PortalLayout>
  );
}

export function StudentVirtualLabs() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Virtual Labs</h1>
        <EmptyState title="No labs unlocked" message="Complete topics to unlock virtual labs" icon={FlaskConical} />
      </div>
    </PortalLayout>
  );
}

export function StudentDiscussions() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Discussion Rooms</h1>
        <EmptyState title="No active discussions" message="Join or create discussion rooms with classmates" icon={MessageSquare} />
      </div>
    </PortalLayout>
  );
}

export function StudentAIMentor() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">AI Mentor</h1>
        <EmptyState title="AI Mentor ready" message="Ask questions and get personalized learning guidance" icon={Bot} />
      </div>
    </PortalLayout>
  );
}
