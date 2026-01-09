import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"classroom" | "individual" | null>(null);
  const [classCode, setClassCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast({ title: "Please enter a class code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("class_code", classCode.toUpperCase())
        .single();

      if (classError || !classData) {
        toast({ title: "Invalid class code", description: "Please check and try again", variant: "destructive" });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("students").update({ class_id: classData.id, learning_mode: "classroom" }).eq("user_id", user.id);
        toast({ title: "Joined class successfully!" });
        navigate("/student/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndividual = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("students").update({ learning_mode: "individual" }).eq("user_id", user.id);
        navigate("/student/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <StarField />
      <Card className="w-full max-w-lg relative z-10 bg-card/80 backdrop-blur-xl border-border">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="font-display text-2xl text-foreground">How do you want to learn?</CardTitle>
          <CardDescription className="text-muted-foreground">Choose your learning path</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!mode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={() => setMode("classroom")} variant="outline" className="h-32 flex flex-col gap-3 bg-gradient-card border-border hover:border-primary">
                <Users className="w-10 h-10 text-primary" />
                <span className="font-display">Join Classroom</span>
              </Button>
              <Button onClick={() => setMode("individual")} variant="outline" className="h-32 flex flex-col gap-3 bg-gradient-card border-border hover:border-secondary">
                <User className="w-10 h-10 text-secondary" />
                <span className="font-display">Learn Individually</span>
              </Button>
            </div>
          ) : mode === "classroom" ? (
            <div className="space-y-4">
              <Label className="text-foreground">Enter Class Code</Label>
              <Input value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} placeholder="ABC123" className="bg-input border-border text-center text-2xl font-display tracking-widest" />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
                <Button onClick={handleJoinClass} disabled={isLoading} className="flex-1 bg-primary">
                  {isLoading ? "Joining..." : "Join Class"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">You'll learn at your own pace with AI-powered guidance.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
                <Button onClick={handleIndividual} disabled={isLoading} className="flex-1 bg-secondary">
                  {isLoading ? "Starting..." : "Start Learning"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
