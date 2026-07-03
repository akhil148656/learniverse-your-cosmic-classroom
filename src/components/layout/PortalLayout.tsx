import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { StarField } from "@/components/ui/StarField";
import { supabase } from "@/integrations/supabase/client";
import { FloatingSpacePet } from "@/components/student/FloatingSpacePet";
import { ClashInviteListener } from "@/components/student/ClashInviteListener";

interface PortalLayoutProps {
  children: ReactNode;
  role: "student" | "teacher" | "parent" | "admin" | "super_admin";
}

export function PortalLayout({ children, role }: PortalLayoutProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/${role}-login`);
        return;
      }

      const userRole = session.user?.user_metadata?.role;
      if (userRole && userRole !== role) {
        console.warn(`User role mismatch. Redirecting ${userRole} from ${role} portal.`);
        navigate(`/${userRole}/dashboard`);
        return;
      }

      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate(`/${role}-login`);
      } else {
        const userRole = session.user?.user_metadata?.role;
        if (userRole && userRole !== role) {
          navigate(`/${userRole}/dashboard`);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StarField />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-cosmic animate-pulse-glow flex items-center justify-center">
            <span className="text-foreground font-display font-bold text-2xl">L</span>
          </div>
          <p className="text-muted-foreground font-display">Loading...</p>
        </div>
      </div>
    );
  }

  const themeClass = role === "admin"
    ? "admin-portal-theme"
    : role === "super_admin"
    ? "super-admin-portal-theme"
    : "";

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full bg-background relative ${themeClass}`}>
        <StarField />
        <AppSidebar role={role} />
        <div className="flex-1 flex flex-col relative z-10">
          <TopBar role={role} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
          {role === "student" && (
            <>
              <FloatingSpacePet />
              <ClashInviteListener />
            </>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
