import { useEffect, useRef, useState, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, Wifi, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const mechanicIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:42px;height:42px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div><div style="position:absolute;top:-2px;right:-2px;width:13px;height:13px;border-radius:50%;background:hsl(142,71%,45%);border:2px solid white;animation:pulse 2s infinite;"></div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -24],
});

const ZoomControls = memo(function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-1/2 right-4 -translate-y-1/2 z-[1000] flex flex-col gap-1.5">
      <button onClick={() => map.zoomIn(1)} className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur shadow border border-border flex items-center justify-center text-foreground text-lg font-bold hover:bg-secondary active:scale-95 transition-all">+</button>
      <button onClick={() => map.zoomOut(1)} className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur shadow border border-border flex items-center justify-center text-foreground text-lg font-bold hover:bg-secondary active:scale-95 transition-all">−</button>
    </div>
  );
});

const RecenterButton = memo(function RecenterButton({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  return (
    <button
      onClick={() => pos && map.setView(pos, 17, { animate: true })}
      className="absolute bottom-28 right-4 z-[1000] w-12 h-12 rounded-full bg-card/95 backdrop-blur-md shadow-lg border border-border flex items-center justify-center text-primary hover:bg-secondary active:scale-95 transition-all"
      aria-label="Recenter"
    >
      <Navigation className="w-5 h-5" />
    </button>
  );
});

const SmoothMarker = memo(function SmoothMarker({ pos }: { pos: [number, number] }) {
  const ref = useRef<L.Marker | null>(null);
  const prev = useRef<[number, number]>(pos);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const from = prev.current;
    const to = pos;
    if (from[0] === to[0] && from[1] === to[1]) return;
    let step = 0;
    const steps = 20;
    let raf: number;
    const animate = () => {
      step++;
      const t = step / steps;
      m.setLatLng([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      if (step < steps) raf = requestAnimationFrame(animate);
      else prev.current = to;
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [pos]);

  return (
    <Marker ref={ref} position={pos} icon={mechanicIcon}>
      <Popup>
        <div className="font-semibold text-sm">🔧 Wewe (Fundi)</div>
        <div className="text-xs text-muted-foreground">Live location</div>
      </Popup>
    </Marker>
  );
});

const MechanicMapPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [gpsOk, setGpsOk] = useState(true);
  const [synced, setSynced] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const lastSentRef = useRef<number>(0);

  // Confirm that this account has a local mechanic profile.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { profile } = await api.get<{ profile: { id: string } | null }>("/mechanics/me").catch(() => ({ profile: null }));
      if (!profile) {
        toast.error("Complete mechanic registration first");
        navigate("/mechanic-onboarding", { replace: true });
        return;
      }
    })();
  }, [user, navigate]);

  // Watch GPS continuously
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsOk(false);
      setPos(DAR_ES_SALAAM);
      toast.error("GPS not supported on this device");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsOk(true);
        setPos([p.coords.latitude, p.coords.longitude]);
      },
      (err) => {
        setGpsOk(false);
        setPos((prev) => prev ?? DAR_ES_SALAAM);
        if (err.code === err.PERMISSION_DENIED) toast.error("Please allow location access");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Push location to the local PHP API every ~5s.
  useEffect(() => {
    if (!pos || !user) return;
    const push = async () => {
      const now = Date.now();
      if (now - lastSentRef.current < 4500) return;
      lastSentRef.current = now;
      try {
        await api.post("/mechanics/me/location", { latitude: pos[0], longitude: pos[1] });
        setSynced(true);
        setLastUpdate(new Date());
      } catch {
        setSynced(false);
      }
    };
    push();
    const iv = setInterval(push, 5000);
    return () => clearInterval(iv);
  }, [pos, user]);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <MapContainer
        center={pos ?? DAR_ES_SALAAM}
        zoom={16}
        maxZoom={19}
        zoomControl={false}
        scrollWheelZoom
        zoomSnap={0.25}
        wheelPxPerZoomLevel={60}
        inertia
        inertiaDeceleration={3000}
        className="w-full h-full"
        style={{ position: "absolute", inset: 0 }}
      >
        <TileLayer
          attribution={TILE_ATTR}
          url={TILE_URL}
          maxZoom={20}
          tileSize={256}
          detectRetina
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={4}
        />
        {pos && <SmoothMarker pos={pos} />}
        <ZoomControls />
        <RecenterButton pos={pos} />
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-[1000] p-4 safe-top max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur shadow border border-border flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 bg-card/90 backdrop-blur rounded-2xl px-4 py-2 shadow border border-border">
            <div className="text-sm font-bold text-foreground">Location Map</div>
            <div className="text-[10px] text-muted-foreground font-medium">Sharing your live location</div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur rounded-2xl px-3.5 py-2.5 shadow border border-border">
            {synced && gpsOk ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-destructive" />
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 inset-x-0 z-[1000] pb-8 px-4 max-w-md mx-auto">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl shadow-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live tracking active
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-semibold tracking-tight">
                {pos ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : "Waiting for GPS coordinates..."}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Last update</div>
              <div className="text-xs font-bold text-foreground mt-0.5">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicMapPage;
