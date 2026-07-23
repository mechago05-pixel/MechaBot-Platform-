import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface HistoryItem {
  id: string;
  category: string;
  status: string;
  created_at: string;
  car_model: string | null;
}

const HistoryPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const all = await api.get<HistoryItem[]>("/requests");
        // Only show non-pending requests (accepted, completed, cancelled, etc.)
        setHistory(all.filter((r) => r.status !== "pending"));
      } catch { setHistory([]); }
      setLoading(false);
    };
    fetchHistory();

    const timer = window.setInterval(fetchHistory, 30000);
    return () => window.clearInterval(timer);
  }, [user]);

  const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    completed: { icon: CheckCircle2, label: "Completed", className: "text-primary bg-primary/10" },
    cancelled: { icon: XCircle, label: "Cancelled", className: "text-destructive bg-destructive/10" },
    pending: { icon: Clock, label: "Pending", className: "text-warning bg-warning/10" },
    accepted: { icon: Clock, label: "Accepted", className: "text-indigo-500 bg-indigo-500/10" },
    on_the_way: { icon: Clock, label: "On the way", className: "text-info bg-info/10" },
    arrived: { icon: Clock, label: "Arrived", className: "text-teal-500 bg-teal-500/10" },
    diagnosis: { icon: Clock, label: "Diagnosis", className: "text-amber-500 bg-amber-500/10" },
    repair: { icon: Clock, label: "Repair", className: "text-orange-500 bg-orange-500/10" },
  };

  const formatCategory = (cat: string) => cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleItemClick = (id: string) => {
    navigate(`/job-status?requestId=${id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display text-foreground">{t("history")}</h1>
        <p className="text-muted-foreground text-sm">{t("pastRequests")}</p>
      </header>

      <main className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No requests yet</p>
          </motion.div>
        ) : (
          history.map((item, i) => {
            const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                onClick={() => handleItemClick(item.id)}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/50 hover:border-primary/30 transition-all active:scale-[0.98]"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.className)}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{formatCategory(item.category)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.car_model || new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className={cn("text-[10px] font-medium", config.className.split(" ")[0])}>{config.label}</p>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;
