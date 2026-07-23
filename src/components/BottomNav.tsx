import { Home, Clock, Bell, MessageCircle, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const [notifications, messages] = await Promise.all([
        api.get<Array<{ status: string }>>("/notifications"), api.get<Array<{ receiver_id: string; status: string }>>("/conversations"),
      ]).catch(() => [[], []] as [Array<{ status: string }>, Array<{ receiver_id: string; status: string }>]);
      setUnreadNotifs(notifications.filter((item) => item.status === "unread").length);
      setUnreadMsgs(messages.filter((item) => item.receiver_id === user.id && item.status === "unread").length);
    };
    fetchCounts();

    const timer = window.setInterval(fetchCounts, 10000);
    return () => window.clearInterval(timer);
  }, [user]);

  const tabs = [
    { icon: Home, label: t("home"), path: "/home" },
    { icon: Clock, label: t("history"), path: "/history" },
    { icon: MessageCircle, label: t("chatMechanic"), path: "/messages", badge: unreadMsgs },
    { icon: Bell, label: t("notifications"), path: "/notifications", badge: unreadNotifs },
    { icon: Settings, label: t("settings"), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map(({ icon: Icon, label, path, badge }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_hsl(155_60%_36%/0.5)]")} />
                {badge && badge > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-[8px] text-destructive-foreground font-bold">{badge > 9 ? "9+" : badge}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-medium leading-none">{label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
      <div className="pb-safe" />
    </nav>
  );
};

export default BottomNav;
