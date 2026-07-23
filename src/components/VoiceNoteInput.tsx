import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceNoteInputProps {
  onDiagnosisComplete: (diagnosis: VoiceDiagnosis) => void;
}

export interface VoiceDiagnosis {
  transcribed_message: string;
  problem_summary: string;
  problem_category: string;
  urgency_level: "low" | "medium" | "high";
  recommended_mechanic_speciality: string;
}

export const VoiceNoteInput = ({ onDiagnosisComplete }: VoiceNoteInputProps) => {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: t("invalidAudioFile"), variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t("fileTooLarge"), variant: "destructive" });
      return;
    }
    setAudioBlob(file);
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendForDiagnosis = async () => {
    if (!audioBlob) return;
    setProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast({ title: t("diagnosisFailed"), description: "Please sign in first.", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-diagnose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            audio_base64: base64,
            mime_type: audioBlob.type,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Diagnosis failed");
      }

      const diagnosis: VoiceDiagnosis = await resp.json();
      onDiagnosisComplete(diagnosis);
    } catch (e: any) {
      toast({
        title: t("diagnosisFailed"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{t("voiceNote")}</label>

      <AnimatePresence mode="wait">
        {recording ? (
          <motion.div
            key="recording"
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
            className="space-y-3"
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
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={sendForDiagnosis}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("analyzingVoice")}
                </>
              ) : (
                t("diagnoseWithAI")
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-3"
          >
            <button
              onClick={startRecording}
              className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{t("recordVoice")}</span>
              <span className="text-xs text-muted-foreground">{t("tapToRecord")}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{t("uploadAudio")}</span>
              <span className="text-xs text-muted-foreground">{t("mp3WavM4a")}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
