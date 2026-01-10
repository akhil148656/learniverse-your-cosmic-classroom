import { PortalLayout } from "@/components/layout/PortalLayout";
import { AIMentorChat } from "@/components/student/AIMentorChat";

export default function StudentAIMentor() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">AI Mentor</h1>
          <p className="text-muted-foreground">Your personal AI learning assistant</p>
        </div>
        <AIMentorChat />
      </div>
    </PortalLayout>
  );
}
