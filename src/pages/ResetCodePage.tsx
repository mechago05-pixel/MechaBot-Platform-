import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const ResetCodePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const email = (location.state as any)?.email || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

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
    // Frontend-only: simulate resend
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError(t("invalidResetCode"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    // Simulate reset (frontend-only)
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
        >
          <ShieldCheck className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("resetPassword")}</h2>
        <p className="text-sm text-primary font-medium">{t("passwordChangedSuccess")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate("/forgot-password")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("enterResetCode")}</h1>
      </header>

      <motion.div
        className="flex-1 px-6 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {t("verifyDesc")}
          </p>
          {email && <p className="text-xs text-primary mt-1">{email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
          {/* OTP Code */}
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full h-14 rounded-2xl bg-card border border-border text-center text-2xl font-display font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Countdown & Resend */}
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

          {/* New Password */}
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("newPassword")}
              className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-11 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm New Password */}
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirmNewPassword")}
              className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-11 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-3.5 text-muted-foreground">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-[11px] text-destructive text-center">{error}</p>}

          <Button variant="hero" size="lg" type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("resetPassword")}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetCodePage;
