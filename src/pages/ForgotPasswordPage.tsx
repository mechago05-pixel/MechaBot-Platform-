import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError(t("validEmail"));
      return;
    }
    setLoading(true);
    // Simulate sending reset code (frontend-only for now)
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
    // Navigate to reset code screen after brief delay
    setTimeout(() => {
      navigate("/reset-code", { state: { email } });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate("/login")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("resetPassword")}</h1>
      </header>

      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">{t("resetPassword")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">{t("enterEmailForReset")}</p>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-primary font-medium">{t("resetCodeSent")}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailAddress")}
                  className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {error && <p className="text-[11px] text-destructive mt-1 pl-2">{error}</p>}
            </div>

            <Button variant="hero" size="lg" type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("sendResetCode")}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
