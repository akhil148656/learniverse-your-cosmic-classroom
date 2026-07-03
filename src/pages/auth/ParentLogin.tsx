import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Baby, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/layout/BackIconButton";

export default function ParentLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wrongRole, setWrongRole] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const resendSignupConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/parent/dashboard`,
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
            emailRedirectTo: `${window.location.origin}/parent/dashboard`,
            data: {
              full_name: formData.fullName,
              role: "parent",
            },
          },
        });

        if (error) throw error;

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
          description: "Redirecting to dashboard...",
        });
        navigate("/parent/hub");
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
        if (userRole && userRole !== "parent") {
          await supabase.auth.signOut();
          setWrongRole(true);
          setTimeout(() => setWrongRole(false), 2000);
          setIsLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting to dashboard...",
        });
        navigate("/parent/hub");
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
              🚫 You don't belong here, traveler! This portal is for Parents only.
            </div>
          )}
          
          <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center mx-auto">
            <Baby className="w-8 h-8 text-accent" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              {isSignUp ? "Create Parent Account" : "Parent Login"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? "Track your child's progress" : "Welcome back!"}
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
                  placeholder="parent@example.com"
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

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
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
              className="text-sm text-accent hover:underline"
            >
              {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
