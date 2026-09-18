import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useI18n();

  const [code, setCode] = useState(params.get("code") || "");
  const [email, setEmail] = useState(params.get("email") || "");
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

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMsg("Enter your email first.");
      return;
    }
    setCanResend(false);
    setCountdown(60);
    setResendMsg("");
    try {
      await api.post("/auth/resend-verification", { email: email.trim() });
      setResendMsg("Verification code sent. Check your inbox.");
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : "Could not resend code.");
      setCanResend(true);
      setCountdown(0);
    }
    setTimeout(() => setResendMsg(""), 5000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Enter the email you registered with.");
      return;
    }
    if (code.length < 6) {
      setError("Enter the code from your email.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-email", { email: cleanEmail, code: code.trim().toUpperCase() });
      setVerified(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Email verified!</h2>
        <p className="text-sm text-primary font-medium">You can now sign in.</p>
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
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
          Enter the 8-character code we emailed you. It expires in 24 hours.
        </p>

        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full h-12 rounded-2xl bg-card border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="XXXXXXXX"
            maxLength={8}
            className="w-full h-14 rounded-2xl bg-card border border-border text-center text-2xl font-display font-bold tracking-[0.4em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
