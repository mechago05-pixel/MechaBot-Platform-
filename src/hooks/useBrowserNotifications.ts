import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const NOTIFICATION_SETTINGS_KEY = "mechabot-notif-settings";

interface NotifSettings {
  enabled: boolean;
  orders: boolean;
  fundiUpdates: boolean;
  messages: boolean;
  promotions: boolean;
  voice: boolean;
}

const defaultSettings: NotifSettings = {
  enabled: true,
  orders: true,
  fundiUpdates: true,
  messages: true,
  promotions: true,
  voice: true,
};

export function getNotifSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveNotifSettings(settings: NotifSettings) {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

function shouldShow(type: string): boolean {
  const s = getNotifSettings();
  if (!s.enabled) return false;
  if (type === "order" || type === "service") return s.orders;
  if (type === "info" || type === "warning") return s.fundiUpdates;
  if (type === "message") return s.messages;
  return true;
}

export function useBrowserNotifications() {
  const { user } = useAuth();
  const permissionRef = useRef<NotificationPermission>("default");

  // Request permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => {
          permissionRef.current = p;
        });
      }
    }
  }, []);

  const showBrowserNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (!("Notification" in window) || permissionRef.current !== "granted") return;
      try {
        const n = new Notification(title, {
          body,
          icon: "/placeholder.svg",
          badge: "/placeholder.svg",
          tag: `mechabot-${Date.now()}`,
        });
        if (onClick) n.onclick = () => { window.focus(); onClick(); };
        // Auto close after 6s
        setTimeout(() => n.close(), 6000);
      } catch {
        // Silent fail for unsupported environments
      }
    },
    []
  );

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("browser-notif-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as { type: string; message: string };
          if (shouldShow(notif.type)) {
            const title =
              notif.type === "order"
                ? "🔧 MechaBot Order"
                : notif.type === "warning"
                  ? "⚠️ MechaBot"
                  : "📢 MechaBot";
            showBrowserNotification(title, notif.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showBrowserNotification]);

  return { showBrowserNotification };
}
