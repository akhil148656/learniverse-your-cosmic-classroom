import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { LayoutDashboard, Baby, Brain, Bell } from "lucide-react";

export function ParentDashboard() {
  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Parent Dashboard</h1>
        <EmptyState title="Welcome!" message="Link your child's account to track their progress" icon={LayoutDashboard} />
      </div>
    </PortalLayout>
  );
}

export function ParentChildProgress() {
  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Child Progress</h1>
        <EmptyState title="No linked children" message="Link your child's account to see their progress" icon={Baby} />
      </div>
    </PortalLayout>
  );
}

export function ParentAIFeedback() {
  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">AI Feedback</h1>
        <EmptyState title="No feedback yet" message="AI-generated insights about your child's learning" icon={Brain} />
      </div>
    </PortalLayout>
  );
}

export function ParentAlerts() {
  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Alerts</h1>
        <EmptyState title="No alerts" message="Important notifications will appear here" icon={Bell} />
      </div>
    </PortalLayout>
  );
}
