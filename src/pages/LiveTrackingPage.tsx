import { ArrowLeft, Navigation, Phone, MessageCircle, MapPin } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LiveTrackingMap from "@/components/LiveTrackingMap";
import { useI18n } from "@/lib/i18n";

const LiveTrackingPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const mechanicId = searchParams.get("mechanicId") || "";

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&travelmode=driving`,
      "_blank"
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Floating header */}
      <header className="absolute top-0 left-0 right-0 z-[1000] flex items-center gap-3 p-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md shadow-lg flex items-center justify-center text-foreground border border-border/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-border/50">
          <h1 className="font-display text-base font-bold text-foreground">
            Live Tracking
          </h1>
          <p className="text-[10px] text-muted-foreground">
            Real-time mechanic location
          </p>
        </div>
        <div className="bg-card/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary">Live</span>
        </div>
      </header>

      {/* Full-screen map */}
      <div className="flex-1 relative">
        {mechanicId ? (
          <LiveTrackingMap
            mechanicId={mechanicId}
            className="h-full !rounded-none !border-0"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MapPin className="w-10 h-10 opacity-40" />
            <p className="text-sm">No mechanic selected for tracking.</p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-6">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="rounded-xl h-12 flex-col gap-0.5 border-border/50"
              onClick={() => navigate(`/chat?mechanicId=${mechanicId}`)}
            >
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-[10px]">Chat</span>
            </Button>
            <Button
              variant="hero"
              className="rounded-xl h-12 flex-col gap-0.5"
              onClick={openGoogleMaps}
            >
              <Navigation className="w-4 h-4" />
              <span className="text-[10px]">Navigate</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-12 flex-col gap-0.5 border-border/50"
              onClick={() => window.open("tel:", "_self")}
            >
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-[10px]">{t("callMechanic")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
