import { motion } from "framer-motion";
import { MapPin, Bot, HelpCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import MapView from "@/components/MapView";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Client dashboard</p>
            <h1 className="text-2xl font-bold font-display text-foreground">MechaBot</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <main className="px-5 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <MapView />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/select-problem")}
            className="w-full"
          >
            <MapPin className="w-5 h-5" />
            {t("findMechanic")}
          </Button>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("whatsWrong")}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {PROBLEM_CATEGORIES.map(({ id, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => navigate(`/request-form?category=${id}`)}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col items-start gap-2 transition-all duration-200 hover:border-primary/40 active:scale-[0.97] text-left"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block leading-tight">{t(`cat.${id}` as any)}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">{t(`cat.${id}.desc` as any)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4 px-1">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              {t("helperText")}
            </p>
          </div>
        </motion.section>

        {role === "admin" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/admin/dashboard")}
              className="w-full border-primary/30"
            >
              <Shield className="w-5 h-5 text-primary" />
              Admin Panel
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;
