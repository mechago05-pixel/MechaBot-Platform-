import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Check, AlertTriangle, Info, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

interface Notification {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  service: Wrench,
  order: Check,
};

const typeColors: Record<string, string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  service: "bg-primary/10 text-primary",
  order: "bg-primary/10 text-primary",
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const timer = window.setInterval(fetchNotifications, 10000);
    return () => window.clearInterval(timer);
  }, [user]);

  const fetchNotifications = async () => {
    try { setNotifications(await api.get<Notification[]>("/notifications")); } catch { setNotifications([]); }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`).catch(() => undefined);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display text-foreground">{t("notifications")}</h1>
            {notifications.length > 0 && (
              <p className="text-xs text-primary font-medium">{notifications.length} unread</p>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No notifications yet</p>
          </motion.div>
        ) : (
          notifications.map((notif, i) => {
            const Icon = typeIcons[notif.type] || Bell;
            const colorClass = typeColors[notif.type] || "bg-muted text-muted-foreground";
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => notif.status === "unread" && markAsRead(notif.id)}
                className={`rounded-2xl p-4 flex items-start gap-3 border transition-all cursor-pointer ${
                  notif.status === "unread"
                    ? "bg-card border-primary/30 shadow-sm"
                    : "bg-card/60 border-border opacity-70"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                {notif.status === "unread" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </motion.div>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
