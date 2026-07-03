import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, Baby, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roles = [
  {
    key: "student",
    label: "Student",
    description: "Start your cosmic learning journey",
    icon: GraduationCap,
    path: "/student-login",
    color: "primary",
    gradient: "from-purple-500/20 to-indigo-500/20",
    borderHover: "hover:border-primary",
    glowHover: "hover:glow-primary",
    iconBg: "bg-primary/20 group-hover:bg-primary/30",
    iconColor: "text-primary",
  },
  {
    key: "teacher",
    label: "Teacher",
    description: "Create & manage cosmic classrooms",
    icon: Users,
    path: "/teacher-login",
    color: "secondary",
    gradient: "from-teal-500/20 to-cyan-500/20",
    borderHover: "hover:border-secondary",
    glowHover: "hover:glow-secondary",
    iconBg: "bg-secondary/20 group-hover:bg-secondary/30",
    iconColor: "text-secondary",
  },
  {
    key: "parent",
    label: "Parent",
    description: "Track your child's progress",
    icon: Baby,
    path: "/parent-login",
    color: "accent",
    gradient: "from-pink-500/20 to-rose-500/20",
    borderHover: "hover:border-accent",
    glowHover: "hover:glow-accent",
    iconBg: "bg-accent/20 group-hover:bg-accent/30",
    iconColor: "text-accent",
  },
];

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-2xl border-border/50 p-0 overflow-hidden">
        {/* Cosmic gradient header bar */}
        <div className="h-1.5 bg-gradient-cosmic w-full" />

        <div className="p-6 sm:p-8">
          <DialogHeader className="text-center mb-8">
            <DialogTitle className="text-2xl sm:text-3xl font-display font-bold">
              Choose Your{" "}
              <span className="text-gradient">Role</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Select how you want to explore the Learniverse
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.key}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(role.path);
                  }}
                  className={`group relative flex flex-col items-center gap-4 p-6 sm:p-8 rounded-2xl
                    bg-gradient-card border border-border ${role.borderHover} ${role.glowHover}
                    transition-all duration-300 card-3d cursor-pointer text-center`}
                >
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl ${role.iconBg} flex items-center justify-center transition-colors duration-300`}
                  >
                    <Icon className={`w-8 h-8 ${role.iconColor}`} />
                  </div>

                  {/* Label */}
                  <div className="space-y-1">
                    <span className="font-display font-semibold text-lg text-foreground block">
                      {role.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight block">
                      {role.description}
                    </span>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                    →
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground px-2">
            <span>Looking for administrative interfaces?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/admin-login");
                }}
                className="text-primary hover:underline font-semibold"
              >
                Admin Portal
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/super-admin-login");
                }}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Super Admin Terminal
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
