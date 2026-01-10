import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { VirtualLabSimulator } from "@/components/student/VirtualLabSimulator";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const subjects = ["Physics", "Chemistry", "Biology", "Geography"];

export default function StudentVirtualLabs() {
  const [searchParams] = useSearchParams();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [unlockedLabs, setUnlockedLabs] = useState<string[]>([]);
  const topic = searchParams.get("topic");

  useEffect(() => {
    const fetchUnlockedLabs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (student) {
        const { data: labProgress } = await supabase
          .from("student_lab_progress")
          .select("lab_id, virtual_labs(title)")
          .eq("student_id", student.id)
          .eq("is_unlocked", true);

        if (labProgress) {
          setUnlockedLabs(labProgress.map((l: any) => l.virtual_labs?.title).filter(Boolean));
        }
      }
    };

    fetchUnlockedLabs();

    // Auto-select Physics if topic mentions related terms
    if (topic) {
      const lowerTopic = topic.toLowerCase();
      if (lowerTopic.includes("ohm") || lowerTopic.includes("electric") || lowerTopic.includes("pendulum")) {
        setSelectedSubject("Physics");
      } else if (lowerTopic.includes("ph") || lowerTopic.includes("acid") || lowerTopic.includes("chemical")) {
        setSelectedSubject("Chemistry");
      }
    }
  }, [topic]);

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Virtual Labs</h1>
          <p className="text-muted-foreground">Interactive simulations to learn by doing</p>
        </div>

        {!selectedSubject ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Select a Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map((subject) => (
                  <Button
                    key={subject}
                    variant="outline"
                    className="h-32 flex flex-col gap-3 bg-gradient-card border-border hover:border-secondary"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <FlaskConical className="w-10 h-10 text-secondary" />
                    <span className="font-display text-lg">{subject}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedSubject(null)}>
              ← Back to Subjects
            </Button>
            <VirtualLabSimulator subject={selectedSubject} topic={topic || undefined} />
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
