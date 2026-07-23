import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Globe, Loader2, Lock, Mail, User, type LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n, type Language } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { role: registrationRole } = useParams<{ role?: "client" | "mechanic" }>();
  const { t, language, setLanguage } = useI18n();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const isSignUp = registrationRole === "client" || registrationRole === "mechanic";
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const pendingRole = localStorage.getItem("mechabot-registration-role");
    localStorage.removeItem("mechabot-registration-role");
    navigate(pendingRole === "mechanic" ? "/mechanic-onboarding" : "/dashboard", { replace: true });
  }, [user, navigate]);

  const goToLogin = () => {
    navigate("/login");
    setRegistrationComplete(false);
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!email.trim() || !email.includes("@")) nextErrors.email = t("validEmail");
    if (!password) nextErrors.password = t("fieldRequired");

    if (isSignUp) {
      if (!fullName.trim()) nextErrors.fullName = t("fieldRequired");
      if (!phone.trim()) nextErrors.phone = t("fieldRequired");
      if (password.length < 6) nextErrors.password = t("passwordMin");
      if (password !== confirmPassword) nextErrors.confirmPassword = t("passwordMismatch");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = isSignUp
        ? await signUp(email.trim(), password, { full_name: fullName.trim(), phone: phone.trim(), role: registrationRole })
        : await signIn(email.trim(), password);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      if (isSignUp) {
        localStorage.setItem("mechabot-registration-role", registrationRole);
        setRegistrationComplete(true);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLanguage = language === "en" ? "sw" : "en";
    setLanguage(nextLanguage);
    localStorage.setItem("mechabot-lang", nextLanguage);
  };

  const langLabel: Record<Language, string> = { en: "EN", sw: "SW" };

  if (registrationComplete) {
    return (
      <AuthShell languageLabel={langLabel[language]} onToggleLanguage={toggleLanguage}>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">{t("checkEmail")}</h1>
        <p className="text-sm text-muted-foreground text-center leading-6 mb-7">
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Confirm your email, then sign in to continue.
        </p>
          <Button variant="hero" size="lg" className="w-full" onClick={goToLogin}>
          {t("signIn")}
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell languageLabel={langLabel[language]} onToggleLanguage={toggleLanguage}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">🤖</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground text-center mb-1">
          {isSignUp ? t("createAccount") : t("welcomeBack")}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-7">
          {isSignUp ? t("joinMechaBot") : t("signInContinue")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && <FieldInput icon={User} placeholder={t("fullName")} value={fullName} onChange={setFullName} error={errors.fullName} autoComplete="name" />}
          <FieldInput icon={Mail} type="email" placeholder={t("emailAddress")} value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
          {isSignUp && <FieldInput icon={User} type="tel" placeholder={t("phoneNumber")} value={phone} onChange={setPhone} error={errors.phone} autoComplete="tel" />}

          <PasswordInput placeholder={t("password")} value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} error={errors.password} autoComplete={isSignUp ? "new-password" : "current-password"} />
          {isSignUp && <PasswordInput placeholder={t("confirmPassword")} value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} error={errors.confirmPassword} autoComplete="new-password" />}

          {!isSignUp && (
            <div className="flex justify-end -mt-1">
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm text-primary font-medium hover:underline">
                {t("forgotPassword")}
              </button>
            </div>
          )}

          <Button variant="hero" size="lg" type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? t("signUp") : t("signIn")}
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-border bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
          <button type="button" onClick={() => navigate(isSignUp ? "/login" : "/register")} className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
            {isSignUp ? t("signIn") : t("createAccount")}
          </button>
        </div>
      </motion.div>
    </AuthShell>
  );
};

const AuthShell = ({ children, languageLabel, onToggleLanguage }: { children: React.ReactNode; languageLabel: string; onToggleLanguage: () => void }) => (
  <div className="min-h-screen bg-background flex flex-col">
    <header className="flex items-center justify-between p-5">
      <button onClick={() => history.length > 1 ? history.back() : undefined} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground" aria-label="Go back">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button onClick={onToggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-medium">
        <Globe className="w-3.5 h-3.5" /> {languageLabel}
      </button>
    </header>
    <main className="flex-1 flex items-center justify-center px-6 pb-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  </div>
);

const FieldInput = ({ icon: Icon, type = "text", placeholder, value, onChange, error, autoComplete }: { icon: LucideIcon; type?: string; placeholder: string; value: string; onChange: (value: string) => void; error?: string; autoComplete?: string }) => (
  <div>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-4 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
    </div>
    {error && <p className="text-[11px] text-destructive mt-1 pl-2">{error}</p>}
  </div>
);

const PasswordInput = ({ placeholder, value, onChange, show, onToggle, error, autoComplete }: { placeholder: string; value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; error?: string; autoComplete: string }) => (
  <div>
    <div className="relative">
      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="w-full h-12 rounded-2xl bg-card border border-border pl-11 pr-11 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    {error && <p className="text-[11px] text-destructive mt-1 pl-2">{error}</p>}
  </div>
);

export default LoginPage;
