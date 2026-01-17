import { useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { AIMentorChat } from "@/components/student/AIMentorChat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentAIMentor() {
  const [showSetupNotice, setShowSetupNotice] = useState(
    !localStorage.getItem("ai-setup-notice-dismissed")
  );

  const dismissNotice = () => {
    localStorage.setItem("ai-setup-notice-dismissed", "true");
    setShowSetupNotice(false);
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">AI Mentor</h1>
          <p className="text-muted-foreground">Your personal AI learning assistant powered by Google Gemini</p>
        </div>

        {showSetupNotice && (
          <Alert className="bg-primary/10 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-foreground flex items-center justify-between">
              <span>AI Features Enabled</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissNotice}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              This AI mentor uses Google Gemini to help you learn. If you see errors, make sure <code className="text-xs bg-muted px-1 py-0.5 rounded">GEMINI_API_KEY</code> (or <code className="text-xs bg-muted px-1 py-0.5 rounded">LOVABLE_API_KEY</code>) is configured in Supabase.
              <br />
              <a href="/AI_SETUP_GUIDE.md" className="text-primary text-sm underline mt-1 inline-block">
                View setup guide →
              </a>
            </AlertDescription>
          </Alert>
        )}

        <AIMentorChat />
      </div>
    </PortalLayout>
  );
}
