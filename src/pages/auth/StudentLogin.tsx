import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/layout/BackIconButton";

export default function StudentLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wrongRole, setWrongRole] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    gradeLevel: "",
    fullName: "",
    gender: "" as "male" | "female" | "other" | "prefer_not_to_say" | "",
    preferredLanguage: "en" as string,
  });

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const resendSignupConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/student/onboarding`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: "Check your inbox (and spam folder) to confirm your email.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to resend confirmation email",
        variant: "destructive",
      });
    }
  };

  const redirectAfterAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/student-login");
      return;
    }

    const { data: studentRow, error } = await supabase
      .from("students")
      .select("learning_mode, class_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // If anything weird happens, go to dashboard and let it handle onboarding.
      // This avoids redirect loops caused by transient read failures.
      navigate("/student/dashboard");
      return;
    }

    const hasMode = !!studentRow?.learning_mode;
    const hasClassWhenNeeded = studentRow?.learning_mode !== "classroom" || !!studentRow?.class_id;
    if (!hasMode || !hasClassWhenNeeded) {
      navigate("/student/onboarding");
      return;
    }

    navigate("/student/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const email = normalizeEmail(formData.email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/student/onboarding`,
            data: {
              full_name: formData.fullName,
              role: "student",
              phone: formData.phone || null,
              grade_level: formData.gradeLevel ? Number(formData.gradeLevel) : null,
              gender: formData.gender || null,
              preferred_language: formData.preferredLanguage || null,
            },
          },
        });

        if (error) throw error;

        // If email confirmations are enabled in Supabase, there may be no session yet.
        if (!data.session) {
          toast({
            title: "Check your email",
            description: "Confirm your email, then log in to continue.",
          });
          setIsSignUp(false);
          return;
        }

        toast({
          title: "Account created!",
          description: "Redirecting to onboarding...",
        });
        await redirectAfterAuth();
      } else {
        const email = normalizeEmail(formData.email);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) throw error;

        // Role mismatch check
        const { data: { user } } = await supabase.auth.getUser();
        const userRole = user?.user_metadata?.role;
        if (userRole && userRole !== "student") {
          await supabase.auth.signOut();
          setWrongRole(true);
          setTimeout(() => setWrongRole(false), 2000);
          setIsLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting...",
        });
        await redirectAfterAuth();
      }
    } catch (error: any) {
      const message = String(error?.message || "Something went wrong");
      const email = normalizeEmail(formData.email);
      const showResend =
        !!email && (/invalid login credentials/i.test(message) || /email not confirmed/i.test(message));
      toast({
        title: "Error",
        description:
          /invalid login credentials/i.test(message)
            ? "Invalid email or password. If you just signed up, confirm your email first."
            : message,
        variant: "destructive",
        action: showResend ? (
          <ToastAction altText="Resend confirmation email" onClick={() => resendSignupConfirmation(email)}>
            Resend email
          </ToastAction>
        ) : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <StarField />
      
      <Card ref={cardRef} className={`w-full max-w-md relative z-10 bg-card/80 backdrop-blur-xl border-border transition-all duration-300 ${wrongRole ? 'animate-shake-reject' : ''}`}>
        <CardHeader className="text-center space-y-4">
          <BackIconButton
            fallbackHref="/"
            preferFallback
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          />
          
          {wrongRole && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              🚫 You don't belong here, traveler! This portal is for Students only.
            </div>
          )}
          
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              {isSignUp ? "Create Student Account" : "Student Login"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? "Join Learniverse today" : "Welcome back, learner!"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="bg-input border-border"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-input border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10 bg-input border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value as any })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeLevel" className="text-foreground">Class / Grade Level</Label>
                  <Select
                    value={formData.gradeLevel}
                    onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select your class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map((grade) => (
                        <SelectItem key={grade} value={grade.toString()}>
                          Class {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Preferred Learning Language</Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                      <SelectItem value="te">Telugu</SelectItem>
                      <SelectItem value="kn">Kannada</SelectItem>
                      <SelectItem value="ml">Malayalam</SelectItem>
                      <SelectItem value="bn">Bengali</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                      <SelectItem value="gu">Gujarati</SelectItem>
                      <SelectItem value="pa">Punjabi</SelectItem>
                      <SelectItem value="ur">Urdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Login"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
