import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CreditCard, LogOut, Loader2 } from "lucide-react";
import { StarField } from "@/components/ui/StarField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ParentHub = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/parent-login");
        return;
      }

      const userRole = session.user?.user_metadata?.role;
      if (userRole && userRole !== "parent") {
        navigate(`/${userRole}/dashboard`);
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error("Failed to log out");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StarField />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="font-display font-semibold text-muted-foreground text-sm animate-pulse">
            Connecting Gateway...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <StarField />

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 w-full py-6 px-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-cosmic flex items-center justify-center">
            <img src="/learniverse-logo.svg" alt="Learniverse" className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Learniverse</span>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl w-full text-center space-y-12 z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
            Parent Portal Gateway
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold">
            Select Your <span className="text-gradient">Destination</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Monitor academic progress or manage billing invoices and child attendance registries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto perspective-container">
          {/* Card 1: Cosmic Academy (LMS) */}
          <button
            onClick={() => {
              localStorage.setItem("parent_portal_mode", "academy");
              navigate("/parent/dashboard");
            }}
            className="group relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-2xl bg-gradient-card border border-border hover:border-primary hover:glow-primary transition-all duration-300 card-3d cursor-pointer text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-10 h-10 text-primary animate-float" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl text-foreground">Academy Hub</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Review child achievements, quiz results, check AI mentor feedback summaries, and sign digital cosmic report cards.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary uppercase tracking-wider group-hover:translate-x-2 transition-transform flex items-center gap-1">
              Enter Academy Hub <span>→</span>
            </div>
          </button>

          {/* Card 2: Space Registry (ERP) */}
          <button
            onClick={() => {
              localStorage.setItem("parent_portal_mode", "registry");
              navigate("/parent/billing");
            }}
            className="group relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-2xl bg-gradient-card border border-border hover:border-accent hover:glow-accent transition-all duration-300 card-3d cursor-pointer text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-10 h-10 text-accent animate-float" style={{ animationDelay: "1.5s" }} />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl text-foreground">Registry Desk</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pay tuition fees online, download invoices, track attendance calendars, and submit absenteeism notes.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-accent uppercase tracking-wider group-hover:translate-x-2 transition-transform flex items-center gap-1">
              Enter Registry Desk <span>→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentHub;
