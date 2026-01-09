import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "accent";
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default" 
}: StatsCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-primary/10 border-primary/30",
    secondary: "bg-secondary/10 border-secondary/30",
    accent: "bg-accent/10 border-accent/30",
  };

  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary/20 text-secondary",
    accent: "bg-accent/20 text-accent",
  };

  return (
    <Card className={`${variantStyles[variant]} border transition-all duration-300 hover:scale-[1.02]`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 text-sm ${
                trend.isPositive ? "text-success" : "text-destructive"
              }`}>
                <span>{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${iconStyles[variant]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
