import { motion } from "framer-motion";
import { ArrowRight, LogIn, ShieldCheck, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/mechabot-logo.png";

const WelcomePage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background flex flex-col px-6 py-8">
      <header className="flex items-center justify-between max-w-md w-full mx-auto">
        <img src={logo} alt="MechaBot" className="h-10 w-auto" />
        <button onClick={() => navigate("/login")} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
          <LogIn className="w-4 h-4" /> {t("signIn")}
        </button>
      </header>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto py-12">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-7 glow">
          <Wrench className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-primary mb-3">Reliable roadside help</p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground leading-tight">Car trouble should not leave you stranded.</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">Describe the issue, request a qualified mechanic, and follow the job from your phone.</p>

        <div className="mt-9 space-y-3">
          <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/register/client")}>
            {t("findMechanic")} <ArrowRight className="w-5 h-5" />
          </Button>
          <button onClick={() => navigate("/register/mechanic")} className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground hover:border-primary/50 transition-colors">
            I’m a mechanic — offer my services
          </button>
        </div>
      </motion.section>

      <div className="max-w-md w-full mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-primary" /> Secure account and verified service professionals
      </div>
    </main>
  );
};

export default WelcomePage;
