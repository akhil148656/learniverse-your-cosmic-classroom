import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/layout/BackIconButton";

export default function AdminLogin() {
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

  const redirectAfterAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin-login");
      return;
    }

    // Check if profile is linked to a school
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !profileData || !profileData.school_id) {
      navigate("/admin/onboarding");
      return;
    }

    navigate("/admin/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const email = normalizeEmail(formData.email);
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/onboarding`,
            data: {
              full_name: formData.fullName,
              role: "admin",
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          toast({
            title: "Check your email",
            description: "Confirm your email address, then log in to continue.",
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) throw error;

        // Role validation check
        const { data: { user } } = await supabase.auth.getUser();
        const userRole = user?.user_metadata?.role;
        if (userRole && userRole !== "admin") {
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
      toast({
        title: "Error",
        description: error?.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative admin-portal-theme">
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
              🚫 You don't belong here, traveler! This portal is for Administrators only.
            </div>
          )}
          
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mx-auto">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              {isSignUp ? "Register School Admin" : "School Admin Login"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? "Register your campus workspace" : "Manage your school's ERP operations"}
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
                  placeholder="admin@school.edu"
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
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
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
              {isSignUp ? "Already have an admin account? Login" : "Register a new school? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
