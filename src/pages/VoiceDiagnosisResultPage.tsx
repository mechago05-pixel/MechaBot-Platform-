import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, AlertTriangle, CheckCircle, MapPin, Navigation } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { VoiceDiagnosis } from "@/components/VoiceNoteInput";

const urgencyColors = {
  low: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  medium: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

const VoiceDiagnosisResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const diagnosis = location.state?.diagnosis as VoiceDiagnosis | undefined;

  if (!diagnosis) {
    navigate("/select-problem", { replace: true });
    return null;
  }

  const uc = urgencyColors[diagnosis.urgency_level];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-5">
        <button
          onClick={() => navigate("/select-problem")}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("aiDiagnosis")}</h1>
      </header>

      <motion.div
        className="px-5 pb-8 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Transcription */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("yourMessage")}</span>
          </div>
          <p className="text-sm text-muted-foreground italic">"{diagnosis.transcribed_message}"</p>
        </div>

        {/* Diagnosis */}
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">{t("detectedProblem")}</span>
          </div>
          <p className="text-sm text-foreground">{diagnosis.problem_summary}</p>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
              {diagnosis.problem_category.replace("-", " ")}
            </span>
            <span className={`px-3 py-1 rounded-full ${uc.bg} ${uc.text} ${uc.border} border text-xs font-semibold capitalize`}>
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {diagnosis.urgency_level} {t("urgency")}
            </span>
          </div>
        </div>

        {/* Specialty needed */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground">{t("recommendedSpecialty")}</span>
          <p className="font-display font-bold text-foreground capitalize mt-1">
            {diagnosis.recommended_mechanic_speciality}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={() =>
              navigate(
                `/request-form?category=${diagnosis.problem_category}&voiceDesc=${encodeURIComponent(diagnosis.problem_summary)}`
              )
            }
          >
            <Navigation className="w-5 h-5" />
            {t("findNearbyMechanics")}
          </Button>

          <Button
            variant="outline"
            size="xl"
            className="w-full"
            onClick={() =>
              navigate(
                `/map?specialty=${encodeURIComponent(diagnosis.recommended_mechanic_speciality)}`
              )
            }
          >
            <MapPin className="w-5 h-5" />
            {t("viewOnMap")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default VoiceDiagnosisResultPage;
