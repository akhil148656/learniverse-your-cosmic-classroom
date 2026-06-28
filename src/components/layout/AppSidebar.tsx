import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileText,
  HelpCircle,
  FlaskConical,
  MessageSquare,
  Bot,
  LogOut,
  Users,
  BarChart3,
  BookOpen,
  Bell,
  Settings,
  User,
  Home,
  Baby,
  Brain,
  Calendar,
  Sparkles,
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
  { title: "Profile", url: "/student/profile", icon: User },
];

const teacherNavItems: NavItem[] = [
  { title: "Dashboard", url: "/teacher/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/teacher/classes", icon: BookOpen },
  { title: "Students", url: "/teacher/students", icon: Users },
  { title: "Assignments", url: "/teacher/assignments", icon: FileText },
  { title: "Analytics", url: "/teacher/analytics", icon: BarChart3 },
  { title: "Feedback", url: "/teacher/feedback", icon: MessageSquare },
  { title: "My Profile", url: "/teacher/profile", icon: User },
];

const parentNavItems: NavItem[] = [
  { title: "Dashboard", url: "/parent/dashboard", icon: LayoutDashboard },
  { title: "Child Progress", url: "/parent/child-progress", icon: Baby },
  { title: "AI Feedback", url: "/parent/ai-feedback", icon: Brain },
  { title: "My Profile", url: "/parent/profile", icon: User },
];

interface AppSidebarProps {
  role: "student" | "teacher" | "parent";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = role === "student" 
    ? studentNavItems 
    : role === "teacher" 
    ? teacherNavItems 
    : parentNavItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-border">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-cosmic flex items-center justify-center">
            <img
              src="/learniverse-logo.svg"
              alt="Learniverse"
              className="w-7 h-7"
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">Learniverse</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} Portal</p>
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
                        ? "bg-primary/20 text-primary glow-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
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
