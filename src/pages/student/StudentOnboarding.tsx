import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, User, ArrowRight, CheckCircle } from "lucide-react";
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
  const [classInfo, setClassInfo] = useState<{ name: string; grade_level: number | null } | null>(null);
  const [codeValidated, setCodeValidated] = useState(false);

  // Validate class code as user types
  useEffect(() => {
    const validateCode = async () => {
      if (classCode.length < 6) {
        setClassInfo(null);
        setCodeValidated(false);
        return;
      }

      const { data, error } = await supabase
        .from("classes")
        .select("id, name, grade_level")
        .eq("class_code", classCode.toUpperCase())
        .single();

      if (data && !error) {
        setClassInfo({ name: data.name, grade_level: data.grade_level });
        setCodeValidated(true);
      } else {
        setClassInfo(null);
        setCodeValidated(false);
      }
    };

    const debounce = setTimeout(validateCode, 300);
    return () => clearTimeout(debounce);
  }, [classCode]);

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast({ title: "Please enter a class code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch class data
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("class_code", classCode.toUpperCase())
        .single();

      if (classError || !classData) {
        toast({ title: "Invalid class code", description: "Please check and try again", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not logged in", description: "Please log in first", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingStudent) {
        // Update existing student record with class_id
        const { error: updateError } = await supabase
          .from("students")
          .update({ 
            class_id: classData.id, 
            learning_mode: "classroom" 
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Update error:", updateError);
          toast({ title: "Error joining class", description: updateError.message, variant: "destructive" });
          setIsLoading(false);
          return;
        }
      } else {
        // Create new student record
        const { error: insertError } = await supabase
          .from("students")
          .insert({ 
            user_id: user.id,
            class_id: classData.id, 
            learning_mode: "classroom" 
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          toast({ title: "Error joining class", description: insertError.message, variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      toast({ title: "Joined class successfully!", description: `Welcome to ${classData.name}` });
      navigate("/student/dashboard");
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
      if (!user) {
        toast({ title: "Not logged in", description: "Please log in first", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingStudent) {
        await supabase
          .from("students")
          .update({ learning_mode: "individual", class_id: null })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("students")
          .insert({ 
            user_id: user.id,
            learning_mode: "individual" 
          });
      }

      navigate("/student/dashboard");
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
              <div className="space-y-2">
                <Label className="text-foreground">Enter Class Code</Label>
                <div className="relative">
                  <Input 
                    value={classCode} 
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())} 
                    placeholder="ABC123" 
                    className="bg-input border-border text-center text-2xl font-display tracking-widest pr-10" 
                    maxLength={6}
                  />
                  {codeValidated && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
              
              {classInfo && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">You're joining:</p>
                  <p className="font-display font-semibold text-foreground">{classInfo.name}</p>
                  {classInfo.grade_level && (
                    <p className="text-sm text-muted-foreground">Grade {classInfo.grade_level}</p>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setMode(null); setClassCode(""); setClassInfo(null); }} className="flex-1">Back</Button>
                <Button 
                  onClick={handleJoinClass} 
                  disabled={isLoading || !codeValidated} 
                  className="flex-1 bg-primary"
                >
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
