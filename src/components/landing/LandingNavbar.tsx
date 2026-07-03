import { useState, useEffect } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LandingNavbarProps {
  onLoginClick: () => void;
}

const LandingNavbar = ({ onLoginClick }: LandingNavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "landing-nav-scrolled py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-cosmic flex items-center justify-center animate-pulse-glow group-hover:scale-110 transition-transform">
            <img
              src="/learniverse-logo.svg"
              alt="Learniverse"
              className="w-6 h-6"
            />
          </div>
          <span className="font-display font-bold text-xl text-foreground hidden sm:block">
            Learniverse
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("features")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection("stats")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Stats
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* Login Button */}
          <Button
            onClick={onLoginClick}
            variant="outline"
            className="hidden sm:flex border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium"
          >
            Login
          </Button>

          {/* Get Started */}
          <Button
            onClick={() => {
              toast.info("Premium Plans Coming Soon!", {
                description: "We're crafting something amazing. Stay tuned! 🚀",
              });
            }}
            className="hidden sm:flex bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 px-6 space-y-3 animate-in slide-in-from-top-2">
          <button
            onClick={() => scrollToSection("features")}
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection("stats")}
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Stats
          </button>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => { setMobileOpen(false); onLoginClick(); }}
              variant="outline"
              className="flex-1 border-primary/40 text-primary"
            >
              Login
            </Button>
            <Button
              onClick={() => {
                setMobileOpen(false);
                toast.info("Premium Plans Coming Soon!", {
                  description: "We're crafting something amazing. Stay tuned! 🚀",
                });
              }}
              className="flex-1 bg-gradient-cosmic text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
