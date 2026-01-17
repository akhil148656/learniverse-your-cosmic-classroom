import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const initialClassCode = (searchParams.get("class") || "").toUpperCase();
  const { toast } = useToast();
  const [mode, setMode] = useState<"classroom" | "individual" | null>(initialClassCode ? "classroom" : null);
  const [classCode, setClassCode] = useState(initialClassCode);
  const [isLoading, setIsLoading] = useState(false);
  const [classInfo, setClassInfo] = useState<{ name: string; grade_level: number | null } | null>(null);
  const [codeValidated, setCodeValidated] = useState(false);

  const applyStudentIdentityDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const meta: any = user.user_metadata || {};
    const phone = typeof meta.phone === "string" ? meta.phone : null;
    const gradeLevel = Number.isFinite(Number(meta.grade_level)) ? Number(meta.grade_level) : null;
    const gender = typeof meta.gender === "string" ? meta.gender : null;
    const preferredLanguageRaw = typeof meta.preferred_language === "string" ? meta.preferred_language : null;
    const preferredLanguage = preferredLanguageRaw ? preferredLanguageRaw.trim() : null;

    // Update profile (phone + gender are stored on profiles)
    try {
      const profilePayload: any = {};
      if (phone) profilePayload.phone = phone;
      if (gender) profilePayload.gender = gender;

      if (Object.keys(profilePayload).length > 0) {
        const update = await supabase
          .from("profiles")
          .update(profilePayload, { count: "exact" })
          .eq("user_id", user.id);

        if (update.error) {
          const msg = String((update.error as any)?.message || "");
          if (/gender/i.test(msg)) {
            const fallbackUpdate: any = {};
            if (phone) fallbackUpdate.phone = phone;
            if (Object.keys(fallbackUpdate).length > 0) {
              await supabase.from("profiles").update(fallbackUpdate, { count: "exact" }).eq("user_id", user.id);
            }
          }
        }

        if ((update.count ?? 0) === 0) {
          const insert = await supabase.from("profiles").insert({ user_id: user.id, ...profilePayload } as any);
          if (insert.error) {
            const msg = String((insert.error as any)?.message || "");
            if (/gender/i.test(msg)) {
              const fallbackInsert: any = { user_id: user.id };
              if (phone) fallbackInsert.phone = phone;
              if (Object.keys(fallbackInsert).length > 1) {
                await supabase.from("profiles").insert(fallbackInsert as any);
              }
            }
          }
        }
      }
    } catch {
      // Non-blocking: onboarding can proceed even if profile update fails.
    }

    // Update or create student row with grade_level + gender
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingStudent) {
      const updatePayload: any = {};
      if (gradeLevel !== null) updatePayload.grade_level = gradeLevel;
      if (gender) updatePayload.gender = gender;
      if (preferredLanguage) updatePayload.preferred_language = preferredLanguage;
      if (Object.keys(updatePayload).length > 0) {
        await supabase
          .from("students")
          .update(updatePayload)
          .eq("user_id", user.id);
      }
    } else {
      const insertPayload: any = { user_id: user.id };
      if (gradeLevel !== null) insertPayload.grade_level = gradeLevel;
      if (gender) insertPayload.gender = gender;
      if (preferredLanguage) insertPayload.preferred_language = preferredLanguage;
      await supabase
        .from("students")
        .insert(insertPayload);
    }
  };

  // Validate class code as user types
  useEffect(() => {
    const validateCode = async () => {
      if (classCode.length < 6) {
        setClassInfo(null);
        setCodeValidated(false);
        return;
      }

      const { data, error } = await supabase.rpc("find_class_by_code", {
        _code: classCode.toUpperCase(),
      });

      const cls = !error && data && data.length > 0 ? data[0] : null;
      if (cls) {
        setClassInfo({ name: cls.name, grade_level: cls.grade_level });
        setCodeValidated(true);
        return;
      }

      setClassInfo(null);
      setCodeValidated(false);
    };

    const debounce = setTimeout(validateCode, 300);
    return () => clearTimeout(debounce);
  }, [classCode]);

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast({ title: "Please enter a class code", variant: "destructive" });
      return;
    }

    if (classCode.trim().length < 6) {
      toast({ title: "Enter a 6-character class code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not logged in", description: "Please log in first", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const code = classCode.trim().toUpperCase();
      const { error } = await supabase.rpc("student_join_class_by_code", { _code: code });

      if (error) {
        toast({
          title: "Could not join class",
          description: error.message || "Please check the code and try again",
          variant: "destructive",
        });
        return;
      }

      // Ensure phone/grade/gender metadata is persisted after joining.
      await applyStudentIdentityDetails();

      toast({
        title: "Joined class successfully!",
        description: classInfo?.name ? `Welcome to ${classInfo.name}` : "Welcome!",
      });
      navigate("/student/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Something went wrong", variant: "destructive" });
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
      const { data: existingStudent, error: existingError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingStudent) {
        const { error } = await supabase
          .from("students")
          .update({ learning_mode: "individual", class_id: null })
          .eq("user_id", user.id);

        if (error) {
          console.error("Failed to update student record:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("students")
          .insert({ 
            user_id: user.id,
            learning_mode: "individual" 
          });

        if (error) {
          console.error("Failed to create student record:", error);
          throw error;
        }
      }

      // Persist phone/grade/gender metadata
      await applyStudentIdentityDetails();

      toast({ title: "Success!", description: "Welcome to individual learning" });
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode(null);
                    setClassCode("");
                    setClassInfo(null);
                    setCodeValidated(false);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleJoinClass} 
                  disabled={isLoading || classCode.trim().length < 6} 
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
