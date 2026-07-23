import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Mic, Square, Upload, Camera, Loader2, X, AlertTriangle,
  CheckCircle, MapPin, Star, Briefcase, Navigation, Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { VoiceDiagnosis } from "@/components/VoiceNoteInput";

const urgencyColors = {
  low: { bg: "bg-success/10", text: "text-success", border: "border-success/30", label: "Low" },
  medium: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30", label: "Medium" },
  high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", label: "High" },
};

interface MatchedMechanic {
  id: string;
  specialties: string[];
  rating: number | null;
  experience_years: number | null;
  tier: string | null;
  garage_location: string | null;
  is_online: boolean;
}

const ReportProblemPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Text input
  const [textDescription, setTextDescription] = useState("");

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<VoiceDiagnosis | null>(null);
  const [matchedMechanic, setMatchedMechanic] = useState<MatchedMechanic | null>(null);

  // --- Voice Recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast({ title: t("micPermissionDenied"), variant: "destructive" });
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // --- Image Upload ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("reportInvalidImage"), variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t("fileTooLarge"), variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // --- AI Analysis ---
  const analyzeWithAI = async () => {
    if (!textDescription.trim() && !audioBlob) {
      toast({ title: t("reportNoInput"), variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setDiagnosis(null);
    setMatchedMechanic(null);

    try {
      let body: Record<string, string> = {};

      if (audioBlob) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        body = { audio_base64: base64, mime_type: audioBlob.type };
      } else {
        body = { text_description: textDescription.trim() };
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-diagnose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      const result: VoiceDiagnosis = await resp.json();
      setDiagnosis(result);

      // Query matching mechanic
      const { data: mechanics } = await supabase
        .from("mechanic_profiles")
        .select("id, specialties, rating, experience_years, tier, garage_location, is_online")
        .eq("approval_status", "approved")
        .eq("is_online", true)
        .contains("specialties", [result.recommended_mechanic_speciality])
        .order("rating", { ascending: false })
        .limit(1);

      if (mechanics && mechanics.length > 0) {
        setMatchedMechanic(mechanics[0]);
      }
    } catch (e: any) {
      toast({ title: t("diagnosisFailed"), description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const uc = diagnosis ? urgencyColors[diagnosis.urgency_level] : null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 p-5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">{t("reportTitle")}</h1>
      </header>

      <div className="px-5 space-y-6">
        {/* A. Text Input */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <label className="text-sm font-semibold text-foreground block mb-2">{t("reportDescLabel")}</label>
          <Textarea
            placeholder={t("reportDescPlaceholder")}
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            className="min-h-[100px] rounded-2xl bg-card border-border"
            maxLength={1000}
          />
        </motion.section>

        {/* B. Voice Recording */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <label className="text-sm font-semibold text-foreground block mb-2">{t("voiceNote")}</label>

          <AnimatePresence mode="wait">
            {recording ? (
              <motion.div
                key="rec"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30"
              >
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive flex-1">
                  {t("recording")}... {formatTime(recordingTime)}
                </span>
                <Button size="sm" variant="destructive" onClick={stopRecording}>
                  <Square className="w-4 h-4 mr-1" />
                  {t("stop")}
                </Button>
              </motion.div>
            ) : audioBlob ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/30">
                  <Mic className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground flex-1">
                    {t("voiceReady")} ({formatTime(recordingTime || Math.round(audioBlob.size / 8000))})
                  </span>
                  <button onClick={clearAudio} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {audioUrl && (
                  <audio controls src={audioUrl} className="w-full rounded-xl" />
                )}
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all active:scale-[0.97]"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground block">{t("recordVoice")}</span>
                    <span className="text-xs text-muted-foreground">{t("tapToRecord")}</span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* C. Image Upload */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <label className="text-sm font-semibold text-foreground block mb-2">{t("reportImageLabel")}</label>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <img src={imagePreview} alt="Car issue" className="w-full h-48 object-cover" />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-dashed border-border hover:border-primary/50 transition-all active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Camera className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground block">{t("reportUploadPhoto")}</span>
                <span className="text-xs text-muted-foreground">JPG, PNG — {t("optional")}</span>
              </div>
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </motion.section>

        {/* 3. Analyze Button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={analyzeWithAI}
            disabled={analyzing || (!textDescription.trim() && !audioBlob)}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("analyzingVoice")}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {t("reportAnalyzeBtn")}
              </>
            )}
          </Button>
        </motion.div>

        {/* 5. Results Panel */}
        <AnimatePresence>
          {diagnosis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Transcription */}
              <Card className="rounded-2xl border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{t("yourMessage")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{diagnosis.transcribed_message}"</p>
                </CardContent>
              </Card>

              {/* Problem Summary */}
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="font-display font-bold text-foreground">{t("reportProblemSummary")}</span>
                  </div>
                  <p className="text-sm text-foreground">{diagnosis.problem_summary}</p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
                      {diagnosis.problem_category.replace("-", " ")}
                    </span>
                    {uc && (
                      <span className={`px-3 py-1 rounded-full ${uc.bg} ${uc.text} ${uc.border} border text-xs font-semibold capitalize`}>
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {uc.label} {t("urgency")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Specialty */}
              <Card className="rounded-2xl border-border">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground">{t("recommendedSpecialty")}</span>
                  <p className="font-display font-bold text-foreground capitalize mt-1">
                    {diagnosis.recommended_mechanic_speciality}
                  </p>
                </CardContent>
              </Card>

              {/* 6. Mechanic Recommendation Card */}
              {matchedMechanic ? (
                <Card className="rounded-2xl border-primary/20">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base font-display">{t("reportRecommendedMechanic")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">
                          {matchedMechanic.tier ? `${matchedMechanic.tier} Mechanic` : "Mechanic"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {matchedMechanic.specialties?.join(", ")}
                        </p>
                      </div>
                      {matchedMechanic.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-sm font-semibold text-foreground">{matchedMechanic.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {matchedMechanic.experience_years && (
                        <span>{matchedMechanic.experience_years} {t("yrsExp")}</span>
                      )}
                      {matchedMechanic.garage_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {matchedMechanic.garage_location}
                        </span>
                      )}
                      <span className={matchedMechanic.is_online ? "text-primary font-medium" : "text-muted-foreground"}>
                        {matchedMechanic.is_online ? t("online") : t("offline")}
                      </span>
                    </div>

                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={() =>
                        navigate(`/request-form?category=${diagnosis.problem_category}&voiceDesc=${encodeURIComponent(diagnosis.problem_summary)}`)
                      }
                    >
                      <Navigation className="w-5 h-5" />
                      {t("reportRequestMechanic")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-border">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("reportNoMechanicFound")}</p>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full mt-3"
                      onClick={() => navigate(`/request-form?category=${diagnosis.problem_category}&voiceDesc=${encodeURIComponent(diagnosis.problem_summary)}`)}
                    >
                      {t("findNearbyMechanics")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 7. Map Placeholder */}
              <Card className="rounded-2xl border-border">
                <CardContent className="p-6 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-display font-bold text-foreground text-sm">{t("reportMapTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("reportMapPlaceholder")}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReportProblemPage;
