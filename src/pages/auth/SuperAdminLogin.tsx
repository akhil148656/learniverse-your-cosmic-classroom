import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarField } from "@/components/ui/StarField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/layout/BackIconButton";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [wrongRole, setWrongRole] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const email = normalizeEmail(formData.email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (error) throw error;

      // Role check: must be super_admin
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role;
      if (userRole && userRole !== "super_admin") {
        await supabase.auth.signOut();
        setWrongRole(true);
        setTimeout(() => setWrongRole(false), 2000);
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome Creator!",
        description: "Entering Platform Control...",
      });
      navigate("/super-admin/dashboard");
    } catch (error: any) {
      toast({
        title: "Access Denied",
        description: error?.message || "Super Admin credentials invalid",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative super-admin-portal-theme">
      <StarField />
      
      <Card ref={cardRef} className={`w-full max-w-md relative z-10 bg-card/85 backdrop-blur-xl border-border transition-all duration-300 ${wrongRole ? 'animate-shake-reject' : ''}`}>
        <CardHeader className="text-center space-y-4">
          <BackIconButton
            fallbackHref="/"
            preferFallback
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          />
          
          {wrongRole && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              🚫 Access Denied! Your credentials do not possess Super Admin clearance.
            </div>
          )}
          
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              Super Admin Console
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Top Authority Terminal Credentials
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="creator@learniverse.io"
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
              {isLoading ? "Validating clearance..." : "Access Console"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
