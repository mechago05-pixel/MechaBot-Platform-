import { motion } from "framer-motion";
import { User, Globe, Bell, LogOut, ChevronRight, Moon, Sun, Database, CheckCircle, XCircle, Loader2, MessageSquare, Wrench, MapPin, Megaphone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n, type Language } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getNotifSettings, saveNotifSettings } from "@/hooks/useBrowserNotifications";

interface TableCounts {
  mechanic_profiles: number | null;
  service_requests: number | null;
  mechanic_locations: number | null;
}

const SettingsPage = () => {
  const [notifSettings, setNotifSettings] = useState(getNotifSettings);
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [dbStatus, setDbStatus] = useState<"loading" | "connected" | "error">("loading");
  const [tableCounts, setTableCounts] = useState<TableCounts>({ mechanic_profiles: null, service_requests: null, mechanic_locations: null });

  useEffect(() => {
    const checkConnection = async () => {
      setDbStatus("loading");
      try {
        const [mechanics, requests, locations] = await Promise.all([
          supabase.from("mechanic_profiles").select("id", { count: "exact", head: true }),
          supabase.from("service_requests").select("id", { count: "exact", head: true }),
          supabase.from("mechanic_locations").select("id", { count: "exact", head: true }),
        ]);

        if (mechanics.error && requests.error && locations.error) {
          setDbStatus("error");
          return;
        }

        setTableCounts({
          mechanic_profiles: mechanics.count ?? 0,
          service_requests: requests.count ?? 0,
          mechanic_locations: locations.count ?? 0,
        });
        setDbStatus("connected");
      } catch {
        setDbStatus("error");
      }
    };
    checkConnection();
  }, []);

  const languageLabels: Record<Language, string> = {
    en: "English",
    sw: "Kiswahili",
  };

  const toggleLanguage = () => {
    const newLang = language === "en" ? "sw" : "en";
    setLanguage(newLang);
    localStorage.setItem("mechabot-lang", newLang);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const tableLabels: Record<keyof TableCounts, string> = {
    mechanic_profiles: "Mechanic Profiles",
    service_requests: "Service Requests",
    mechanic_locations: "Mechanic Locations",
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display text-foreground">{t("settings")}</h1>
        <p className="text-muted-foreground text-sm">{t("manageAccount")}</p>
      </header>

      <main className="px-5 space-y-6">
        {/* Backend Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Database className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Backend Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {dbStatus === "loading" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    <span className="text-xs text-muted-foreground">Checking connection…</span>
                  </>
                )}
                {dbStatus === "connected" && (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs text-success font-medium">Connected</span>
                  </>
                )}
                {dbStatus === "error" && (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive font-medium">Not Connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {dbStatus === "connected" && (
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(tableCounts) as (keyof TableCounts)[]).map((key) => (
                <div key={key} className="bg-secondary/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{tableCounts[key] ?? "–"}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">{tableLabels[key]}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">{user?.user_metadata?.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border"
        >
          {/* Language */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-4 p-4 w-full text-left transition-colors hover:bg-secondary/50"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Globe className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t("language")}</p>
              <p className="text-xs text-muted-foreground">{languageLabels[language]}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 p-4 w-full text-left transition-colors hover:bg-secondary/50"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t("theme")}</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? t("darkMode") : t("lightMode")}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Notifications Master */}
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Bell className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t("notifications")}</p>
              <p className="text-xs text-muted-foreground">{t("pushEmail")}</p>
            </div>
            <Switch
              checked={notifSettings.enabled}
              onCheckedChange={(v) => {
                const updated = { ...notifSettings, enabled: v };
                setNotifSettings(updated);
                saveNotifSettings(updated);
              }}
            />
          </div>
        </motion.div>

        {/* Notification Categories */}
        {notifSettings.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border"
          >
            {([
              { key: "orders" as const, label: "Orders", desc: "Order status updates", Icon: Wrench },
              { key: "fundiUpdates" as const, label: "Fundi Updates", desc: "Location & arrival alerts", Icon: MapPin },
              { key: "messages" as const, label: "Messages", desc: "New chat messages", Icon: MessageSquare },
              { key: "promotions" as const, label: "Promotions", desc: "Offers & announcements", Icon: Megaphone },
              { key: "voice" as const, label: t("voiceNotifications"), desc: t("voiceNotificationsDesc"), Icon: Volume2 },
            ]).map(({ key, label, desc, Icon }) => (
              <div key={key} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={notifSettings[key]}
                  onCheckedChange={(v) => {
                    const updated = { ...notifSettings, [key]: v };
                    setNotifSettings(updated);
                    saveNotifSettings(updated);
                  }}
                />
              </div>
            ))}
          </motion.div>
        )}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button variant="destructive" size="lg" className="w-full rounded-2xl" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            {t("logOut")}
          </Button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
