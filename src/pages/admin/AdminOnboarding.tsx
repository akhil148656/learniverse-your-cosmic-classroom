import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, Plus, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"choice" | "create" | "join">("choice");
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      // Generate a unique school code
      const generatedCode = `SCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // 1. Insert School record
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .insert([
          {
            name: schoolName.trim(),
            school_code: generatedCode,
          },
        ])
        .select()
        .single();

      if (schoolError) throw schoolError;

      // 2. Link Admin profile to the school
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ school_id: school.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast.success(`School "${schoolName}" registered successfully!`);
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create school workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      // 1. Find school by code
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name")
        .eq("school_code", schoolCode.trim().toUpperCase())
        .maybeSingle();

      if (schoolError) throw schoolError;

      if (!school) {
        toast.error("Invalid school registration code. Please check and try again.");
        setIsLoading(false);
        return;
      }

      // 2. Link Admin profile to the school
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ school_id: school.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast.success(`Connected to "${school.name}" successfully!`);
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to link school workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative admin-portal-theme">
      <StarField />
      
      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-xl border-border">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mx-auto animate-float">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              {step === "choice" && "Register School Tenant"}
              {step === "create" && "Create New Campus"}
              {step === "join" && "Join Campus Workspace"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === "choice" && "Set up a new school registry or link to an existing campus."}
              {step === "create" && "Establish a new isolated directory for your school."}
              {step === "join" && "Enter the school code to connect your admin account."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {step === "choice" && (
            <div className="space-y-4">
              <Button
                onClick={() => setStep("create")}
                className="w-full h-auto py-5 flex items-center justify-start gap-4 border border-primary/20 hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-foreground"
                variant="outline"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block text-sm">Create a New School</span>
                  <span className="text-xs text-muted-foreground">Establish a brand new school directory</span>
                </div>
              </Button>

              <Button
                onClick={() => setStep("join")}
                className="w-full h-auto py-5 flex items-center justify-start gap-4 border border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-foreground"
                variant="outline"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block text-sm">Join Existing School</span>
                  <span className="text-xs text-muted-foreground">Link this profile using a school code</span>
                </div>
              </Button>
            </div>
          )}

          {step === "create" && (
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-foreground">School / College Name</Label>
                <Input
                  id="schoolName"
                  required
                  placeholder="e.g. Star Academy High School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="bg-input border-border"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("choice")}
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary text-white font-medium hover:opacity-90 flex items-center justify-center gap-1"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Register Campus <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </form>
          )}

          {step === "join" && (
            <form onSubmit={handleJoinSchool} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolCode" className="text-foreground">School Registration Code</Label>
                <Input
                  id="schoolCode"
                  required
                  placeholder="e.g. SCH-XXXXXX"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="bg-input border-border font-mono uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("choice")}
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary text-white font-medium hover:opacity-90 flex items-center justify-center gap-1"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Connect <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
