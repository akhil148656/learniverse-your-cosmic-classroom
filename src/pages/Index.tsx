import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, Baby, Rocket, Sparkles, Atom } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarField } from "@/components/ui/StarField";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <StarField />
      
      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-cosmic flex items-center justify-center animate-pulse-glow">
                <img
                  src="/learniverse-logo.svg"
                  alt="Learniverse"
                  className="w-8 h-8"
                />
              </div>
              <span className="font-display font-bold text-2xl text-foreground">Learniverse</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            {/* Tagline */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Education</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground leading-tight">
                Welcome to{" "}
                <span className="text-gradient">Learniverse</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                AI-powered gamified learning for focused education
              </p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Button
                onClick={() => navigate("/student-login")}
                className="h-auto py-8 px-6 flex flex-col items-center gap-4 bg-gradient-card border border-border hover:border-primary hover:glow-primary transition-all duration-300 group"
                variant="outline"
              >
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <span className="font-display font-semibold text-lg text-foreground block">Student</span>
                  <span className="text-sm text-muted-foreground">Start learning</span>
                </div>
              </Button>

              <Button
                onClick={() => navigate("/teacher-login")}
                className="h-auto py-8 px-6 flex flex-col items-center gap-4 bg-gradient-card border border-border hover:border-secondary hover:glow-secondary transition-all duration-300 group"
                variant="outline"
              >
                <div className="w-16 h-16 rounded-xl bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <div className="space-y-1">
                  <span className="font-display font-semibold text-lg text-foreground block">Teacher</span>
                  <span className="text-sm text-muted-foreground">Manage classes</span>
                </div>
              </Button>

              <Button
                onClick={() => navigate("/parent-login")}
                className="h-auto py-8 px-6 flex flex-col items-center gap-4 bg-gradient-card border border-border hover:border-accent hover:glow-accent transition-all duration-300 group"
                variant="outline"
              >
                <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <Baby className="w-8 h-8 text-accent" />
                </div>
                <div className="space-y-1">
                  <span className="font-display font-semibold text-lg text-foreground block">Parent</span>
                  <span className="text-sm text-muted-foreground">Track progress</span>
                </div>
              </Button>
            </div>

            {/* Features */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                <span>Adaptive Learning</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>Virtual Labs</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-accent" />
                <span>AI Mentor</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-6 px-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Learniverse. Empowering education through technology.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
