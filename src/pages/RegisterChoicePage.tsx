import { ArrowLeft, ChevronRight, User, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const RegisterChoicePage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background px-6 py-5">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground" aria-label="Back to welcome page">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <section className="pt-16">
          <p className="text-sm font-semibold text-primary mb-2">New to MechaBot?</p>
          <h1 className="font-display text-3xl font-bold text-foreground">How will you use MechaBot?</h1>
          <p className="text-sm leading-6 text-muted-foreground mt-3 mb-8">Choose an account type. You can complete your profile after creating your account.</p>

          <div className="space-y-4">
            <RoleOption icon={User} title={t("iAmClient")} description={t("clientDesc")} onClick={() => navigate("/register/client")} />
            <RoleOption icon={Wrench} title={t("iAmMechanic")} description="Create a professional profile and start offering repair services." onClick={() => navigate("/register/mechanic")} />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")} <button onClick={() => navigate("/login")} className="font-semibold text-primary underline underline-offset-4">{t("signIn")}</button>
          </p>
        </section>
      </div>
    </main>
  );
};

const RoleOption = ({ icon: Icon, title, description, onClick }: { icon: typeof User; title: string; description: string; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left rounded-2xl border border-border bg-card p-5 flex items-center gap-4 card-shadow hover:border-primary/50 hover:-translate-y-0.5 transition-all">
    <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="w-6 h-6 text-primary" /></div>
    <div className="flex-1"><h2 className="font-display font-bold text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

export default RegisterChoicePage;
