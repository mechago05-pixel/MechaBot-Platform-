import { User, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const RoleSelectPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { role, user } = useAuth();
  const [busy, setBusy] = useState(false);

  // If role already known, redirect
  useEffect(() => {
    if (role === "mechanic") navigate("/mechanic-dashboard", { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
  }, [role, navigate]);

  const onPickMechanic = async () => {
    if (!user) return;
    setBusy(true);
    // If a mechanic profile already exists, go straight to dashboard
    const { profile: data } = await api.get<{ profile: { id: string } | null }>("/mechanics/me");
    setBusy(false);
    if (data?.id) navigate("/mechanic-dashboard");
    else navigate("/mechanic-onboarding");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <span className="text-3xl">🤖</span>
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">MechaBot</h1>
      <p className="text-sm text-muted-foreground mb-8">{t("selectRole")}</p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate("/home")}
          className="w-full rounded-2xl bg-card border border-border p-5 flex items-center gap-4 transition-all hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-foreground">{t("iAmClient")}</p>
            <p className="text-xs text-muted-foreground">{t("clientDesc")}</p>
          </div>
        </button>

        <button
          onClick={onPickMechanic}
          disabled={busy}
          className="w-full rounded-2xl bg-card border border-border p-5 flex items-center gap-4 transition-all hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-foreground">{t("iAmMechanic")}</p>
            <p className="text-xs text-muted-foreground">{t("mechanicDesc")}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelectPage;
