import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle, Mic } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { VoiceNoteInput, type VoiceDiagnosis } from "@/components/VoiceNoteInput";

const SelectProblemPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showVoice, setShowVoice] = useState(false);
  const [searchParams] = useSearchParams();
  const mechanicId = searchParams.get("mechanicId");
  const mechSuffix = mechanicId ? `&mechanicId=${mechanicId}` : "";

  const handleDiagnosis = (diagnosis: VoiceDiagnosis) => {
    navigate("/voice-diagnosis", { state: { diagnosis } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("selectProblem")}</h1>
      </header>

      <div className="px-5 pb-8">
        <p className="text-muted-foreground mb-6">{t("selectProblemDesc")}</p>

        {/* Voice Note Section */}
        {showVoice ? (
          <div className="mb-6">
            <VoiceNoteInput onDiagnosisComplete={handleDiagnosis} />
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowVoice(true)}
            className="w-full flex items-center gap-3 p-4 mb-6 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="font-display font-semibold text-sm text-foreground block">{t("orDescribeByVoice")}</span>
              <span className="text-xs text-muted-foreground">{t("tapToRecord")}</span>
            </div>
          </motion.button>
        )}

        <div className="grid grid-cols-2 gap-3">
          {PROBLEM_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                onClick={() => navigate(`/request-form?category=${cat.id}${mechSuffix}`)}
                className="flex flex-col items-start gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-200 card-shadow active:scale-[0.97] text-left"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: cat.color }} />
                </div>
                <div>
                  <span className="font-display font-semibold text-sm text-foreground block">{t(`cat.${cat.id}` as any)}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">{t(`cat.${cat.id}.desc` as any)}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-5 px-1">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">{t("helperText")}</p>
        </div>
      </div>
    </div>
  );
};

export default SelectProblemPage;
