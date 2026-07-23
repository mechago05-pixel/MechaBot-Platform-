import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = () => {
    setCanResend(false);
    setCountdown(60);
    setResendMsg(t("codeSent"));
    setTimeout(() => setResendMsg(""), 3000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError(t("invalidCode"));
      return;
    }

    setLoading(true);
    // Simulate verification (frontend-only)
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);

    // Mock: any 6-digit code is accepted
    setVerified(true);
    setTimeout(() => navigate("/home"), 2000);
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("verifyEmail")}</h2>
        <p className="text-sm text-primary font-medium">{t("codeSent")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate("/login")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("verifyEmail")}</h1>
      </header>

      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">{t("verifyEmail")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">{t("verifyDesc")}</p>

        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full h-14 rounded-2xl bg-card border border-border text-center text-2xl font-display font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {error && <p className="text-[11px] text-destructive text-center">{error}</p>}
          {resendMsg && <p className="text-[11px] text-primary text-center">{resendMsg}</p>}

          <Button variant="hero" size="lg" type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("verify")}
          </Button>

          <div className="text-center">
            {canResend ? (
              <button type="button" onClick={handleResend} className="text-sm text-primary font-medium">
                {t("resendCode")}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("resendIn")} {countdown}s
              </p>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;
