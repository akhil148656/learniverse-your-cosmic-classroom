import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { Search } from "lucide-react";

export default function StudentSearch() {
  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Learn & Search</h1>
        <EmptyState title="Search for topics" message="Use the search bar above to find topics and get AI-generated notes" icon={Search} />
      </div>
    </PortalLayout>
  );
}
