import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileText,
  HelpCircle,
  FlaskConical,
  MessageSquare,
  LogOut,
  Users,
  BarChart3,
  BookOpen,
  User,
  Home,
  Baby,
  Brain,
  Calendar,
  Sparkles,
  ClipboardCheck,
  CreditCard,
  ChevronDown,
  Building,
  Rocket,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentNavItems: NavItem[] = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Study Planner", url: "/student/planner", icon: Calendar },
  { title: "Search and Learn", url: "/student/search", icon: Search },
  { title: "Assignments", url: "/student/assignments", icon: FileText },
  { title: "Quizzes", url: "/student/quizzes", icon: HelpCircle },
  { title: "Virtual Labs", url: "/student/virtual-labs", icon: FlaskConical },
  { title: "Discussions", url: "/student/discussions", icon: MessageSquare },
  { title: "Study Buddy", url: "/student/study-buddy", icon: Sparkles },
  { title: "Timetable", url: "/student/timetable", icon: Calendar },
  { title: "Profile", url: "/student/profile", icon: User },
];

const teacherLmsNavItems: NavItem[] = [
  { title: "Dashboard", url: "/teacher/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/teacher/classes", icon: BookOpen },
  { title: "Students", url: "/teacher/students", icon: Users },
  { title: "Assignments", url: "/teacher/assignments", icon: FileText },
  { title: "Analytics", url: "/teacher/analytics", icon: BarChart3 },
  { title: "Feedback", url: "/teacher/feedback", icon: MessageSquare },
  { title: "My Profile", url: "/teacher/profile", icon: User },
];

const teacherErpNavItems: NavItem[] = [
  { title: "Attendance Register", url: "/teacher/attendance", icon: ClipboardCheck },
  { title: "Class Timetable", url: "/teacher/timetable", icon: Calendar },
  { title: "Hub Gateway", url: "/teacher/hub", icon: Home },
];

const parentLmsNavItems: NavItem[] = [
  { title: "Dashboard", url: "/parent/dashboard", icon: LayoutDashboard },
  { title: "Child Progress", url: "/parent/child-progress", icon: Baby },
  { title: "AI Feedback", url: "/parent/ai-feedback", icon: Brain },
  { title: "My Profile", url: "/parent/profile", icon: User },
];

const parentErpNavItems: NavItem[] = [
  { title: "Finance & Billing", url: "/parent/billing", icon: CreditCard },
  { title: "Hub Gateway", url: "/parent/hub", icon: Home },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Class Registry", url: "/admin/classes", icon: BookOpen },
  { title: "Timetable Master", url: "/admin/timetable", icon: Calendar },
  { title: "Billing Center", url: "/admin/billing", icon: CreditCard },
];

const superAdminNavItems: NavItem[] = [
  { title: "Global Dashboard", url: "/super-admin/dashboard", icon: LayoutDashboard },
  { title: "School Tenancy", url: "/super-admin/schools", icon: Building },
  { title: "Admin Directory", url: "/super-admin/admins", icon: Users },
];

interface AppSidebarProps {
  role: "student" | "teacher" | "parent" | "admin" | "super_admin";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [portalMode, setPortalMode] = useState<"academy" | "registry">((() => {
    if (role === "teacher") {
      return (localStorage.getItem("teacher_portal_mode") as "academy" | "registry") || "academy";
    }
    if (role === "parent") {
      return (localStorage.getItem("parent_portal_mode") as "academy" | "registry") || "academy";
    }
    return "academy";
  })());

  const handleModeChange = (mode: "academy" | "registry") => {
    setPortalMode(mode);
    if (role === "teacher") {
      localStorage.setItem("teacher_portal_mode", mode);
      if (mode === "academy") {
        navigate("/teacher/dashboard");
      } else {
        navigate("/teacher/attendance");
      }
    } else if (role === "parent") {
      localStorage.setItem("parent_portal_mode", mode);
      if (mode === "academy") {
        navigate("/parent/dashboard");
      } else {
        navigate("/parent/billing");
      }
    }
  };

  const navItems = role === "student"
    ? studentNavItems
    : role === "teacher"
      ? (portalMode === "academy" ? teacherLmsNavItems : teacherErpNavItems)
      : role === "parent"
        ? (portalMode === "academy" ? parentLmsNavItems : parentErpNavItems)
        : role === "admin"
          ? adminNavItems
          : superAdminNavItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg bg-gradient-cosmic flex items-center justify-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src="/learniverse-logo.svg"
              alt="Learniverse"
              className="w-7 h-7"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 
              className="font-display font-bold text-lg text-foreground leading-tight cursor-pointer"
              onClick={() => navigate("/")}
            >
              Learniverse
            </h1>
            {role === "student" ? (
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{role} Portal</p>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 outline-none font-medium cursor-pointer">
                  {portalMode === "academy" ? (
                    <>
                      <Rocket className="w-3 h-3 text-primary animate-pulse" />
                      <span>Academy Mode</span>
                    </>
                  ) : (
                    <>
                      <Building className="w-3 h-3 text-secondary animate-pulse" />
                      <span>Registry (ERP)</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card/95 backdrop-blur-xl border-border w-48 z-50">
                  <DropdownMenuItem 
                    onClick={() => handleModeChange("academy")}
                    className={`flex items-center gap-2 cursor-pointer py-2 ${portalMode === "academy" ? "text-primary font-semibold" : ""}`}
                  >
                    <Rocket className="w-4 h-4 text-primary" />
                    <span>Cosmic Academy</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleModeChange("registry")}
                    className={`flex items-center gap-2 cursor-pointer py-2 ${portalMode === "registry" ? "text-secondary font-semibold" : ""}`}
                  >
                    <Building className="w-4 h-4 text-secondary" />
                    <span>Space Registry (ERP)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-display uppercase tracking-wider px-3 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive(item.url)
                        ? "bg-primary/20 text-primary glow-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
