import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Bell, CheckCircle, Trash2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { EmptyState } from "@/components/cards/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationData {
  id: string;
  created_at: string;
  is_read: boolean | null;
  link: string | null;
  message: string | null;
  title: string;
  type: string | null;
  user_id: string;
}

export default function StudentAlerts() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const filtered = (data || []).filter((n) => (n.link || "").startsWith("/student/"));
      setNotifications(filtered);
      setIsLoading(false);
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Failed to delete notification", error);
      toast.error(error.message || "Failed to delete notification");
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    toast.success("Notification deleted");
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "warning":
      case "alert":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-accent" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const onOpenNotification = async (n: NotificationData) => {
    await markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted-foreground">Important notifications about your assignments and progress</p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No alerts" message="Important notifications will appear here" icon={Bell} />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`bg-card border-border cursor-pointer transition-colors hover:border-primary ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => onOpenNotification(n)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {getTypeIcon(n.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      title="Delete notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteNotification(n.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

