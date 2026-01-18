import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BackIconButton } from "@/components/layout/BackIconButton";

interface TopBarProps {
  showSearch?: boolean;
  role: "student" | "teacher" | "parent";
}

export function TopBar({ showSearch = true, role }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const isDashboard = location.pathname === `/${role}/dashboard`;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let intervalId: number | null = null;

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .single();
        if (data) setProfile(data);

        const refreshUnreadCount = async () => {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
            .like("link", `/${role}/%`);
          setNotificationCount(count || 0);
        };

        await refreshUnreadCount();

        // Fallback polling in case Realtime isn't enabled for this table.
        intervalId = window.setInterval(() => {
          refreshUnreadCount();
        }, 15000);

        // Keep unread count fresh when notifications are inserted/updated.
        channel = supabase
          .channel(`notifications-count-${user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
            () => {
              refreshUnreadCount();
            }
          )
          .subscribe();
      }
    };
    fetchProfile();

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && role === "student") {
      navigate(`/student/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDashboardBack = async () => {
    const ok = window.confirm("Do you want to log out and go back?");
    if (!ok) return;

    try {
      await supabase.auth.signOut();
    } finally {
      // Always return to the public home page after logging out.
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          {isDashboard ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDashboardBack}
              title="Back"
              aria-label="Back"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <BackIconButton
              fallbackHref={`/${role}/dashboard`}
              className="text-muted-foreground hover:text-foreground"
            />
          )}
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-cosmic flex items-center justify-center">
              <img
                src="/learniverse-logo.svg"
                alt="Learniverse"
                className="w-6 h-6"
              />
            </div>
            <span className="font-display font-bold text-foreground hidden sm:block">
              Learniverse
            </span>
          </div>
        </div>

        {showSearch && role === "student" && (
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search any topic or ask AI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-border focus:border-primary focus:ring-primary"
              />
            </div>
          </form>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/${role}/alerts`)}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary">
                {notificationCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="font-medium text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
