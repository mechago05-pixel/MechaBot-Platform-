import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Car, Loader2, Mic, MicOff, MapPin } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PROBLEM_CATEGORIES, type VehicleSize } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const vehicleSizes: { id: VehicleSize; icon: string }[] = [
  { id: "small", icon: "🚗" },
  { id: "medium", icon: "🚙" },
  { id: "large", icon: "🚐" },
];

const RequestFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category") || "other";
  const category = PROBLEM_CATEGORIES.find((c) => c.id === categoryId);
  const targetMechanicId = searchParams.get("mechanicId"); // optional: pre-targeted mechanic (auth user_id)
  const { t } = useI18n();

  const voiceDesc = searchParams.get("voiceDesc") || "";
  const [description, setDescription] = useState(voiceDesc);
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>("medium");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech not supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "sw-TZ";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  const getClientLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Location permission denied or error - proceed without location
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }

    const sanitize = (s: string) => s.replace(/<[^>]*>/g, "").trim();
    const cleanDesc = sanitize(description).slice(0, 1000);
    const cleanModel = sanitize(carModel).slice(0, 100);
    const cleanYear = carYear.replace(/\D/g, "").slice(0, 4) || null;

    setSubmitting(true);
    
    // Capture client location for nearby mechanic matching
    let clientLat: number | null = null;
    let clientLng: number | null = null;
    try {
      const loc = await getClientLocation();
      if (loc) {
        clientLat = loc.lat;
        clientLng = loc.lng;
      }
    } catch {
      // Location unavailable - proceed without it
    }

    try {
      const request = await api.post<{ id: string }>("/requests", {
        category: categoryId,
        description: cleanDesc || null,
        car_model: cleanModel,
        car_year: cleanYear,
        vehicle_size: vehicleSize,
        mechanic_id: targetMechanicId || null,
        client_lat: clientLat,
        client_lng: clientLng,
      });
      toast({
        title: targetMechanicId ? "Request sent to mechanic!" : "Request submitted!",
        description: clientLat && clientLng
          ? (targetMechanicId
              ? "The nearby mechanic has been notified and will respond shortly."
              : "Searching for nearby mechanics to accept your request.")
          : (targetMechanicId
              ? "The mechanic has been notified and will respond shortly."
              : undefined),
      });
      navigate(`/nearby-mechanics?requestId=${request.id}`);
    } catch (error) {
      toast({ title: "Failed to submit request", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{t("describeIssue")}</h1>
          {category && (
            <span className="text-xs text-primary font-medium">{t(`cat.${categoryId}` as any)}</span>
          )}
        </div>
      </header>

      <motion.div
        className="px-5 pb-8 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Description with Voice Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("whatsHappening")}</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              className="w-full h-28 rounded-2xl bg-card border border-border px-4 py-3 pr-14 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          {isListening && (
            <p className="text-xs text-primary animate-pulse">🎤 Listening... speak now</p>
          )}
        </div>

        {/* Car Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("carModel")}</label>
          <input
            type="text"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder={t("carModelPlaceholder")}
            className="w-full h-12 rounded-2xl bg-card border border-border px-4 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>

        {/* Car Year */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("carYear")} <span className="text-muted-foreground">({t("optional")})</span></label>
          <input
            type="number"
            value={carYear}
            onChange={(e) => setCarYear(e.target.value)}
            placeholder="e.g. 2020"
            className="w-full h-12 rounded-2xl bg-card border border-border px-4 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>

        {/* Vehicle Size */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("vehicleSize")}</label>
          <div className="grid grid-cols-3 gap-3">
            {vehicleSizes.map((vs) => (
              <button
                key={vs.id}
                onClick={() => setVehicleSize(vs.id)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all duration-200 ${
                  vehicleSize === vs.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <span className="text-2xl">{vs.icon}</span>
                <span className={`text-xs font-semibold capitalize ${vehicleSize === vs.id ? "text-primary" : "text-foreground"}`}>
                  {t(`size.${vs.id}` as any)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location indicator */}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Your location</span> will be used to find the nearest available mechanic.
          </div>
        </div>

        <Button
          variant="hero"
          size="xl"
          className="w-full"
          disabled={!description || !carModel || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {submitting ? "Submitting..." : t("findNearbyMechanics")}
        </Button>
      </motion.div>
    </div>
  );
};

export default RequestFormPage;