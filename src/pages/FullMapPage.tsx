import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Navigation, Search, Clock, MapPin } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { haversineDistance } from "@/hooks/useLocationTriggers";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];
const SIMULATE = true;

// Fast, lightweight tiles
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const fundiIconOnline = new L.DivIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div><div style="position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:hsl(142,71%,45%);border:2px solid white;"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

const fundiIconOffline = new L.DivIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div><div style="position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:hsl(0,84%,60%);border:2px solid white;"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:hsl(142,71%,45%);border:3px solid white;box-shadow:0 0 0 5px hsla(142,71%,45%,0.2), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
});

interface MechanicLocation {
  mechanic_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

interface ProfileMeta {
  user_id: string;
  full_name: string | null;
  rating: number | null;
  specialties: string[] | null;
}

interface RouteInfo {
  mechanic_id: string;
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
}

function isOnline(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() < 30 * 1000;
}

function timeAgo(updatedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Zoom controls - memoized
const ZoomControls = memo(function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 z-[1000] flex flex-col gap-1">
      <button onClick={() => map.zoomIn(1)} className="w-10 h-10 rounded-lg bg-card/90 backdrop-blur shadow border border-border flex items-center justify-center text-foreground text-lg font-bold active:scale-95 transition-transform" aria-label="Zoom in">+</button>
      <button onClick={() => map.zoomOut(1)} className="w-10 h-10 rounded-lg bg-card/90 backdrop-blur shadow border border-border flex items-center justify-center text-foreground text-lg font-bold active:scale-95 transition-transform" aria-label="Zoom out">−</button>
    </div>
  );
});

const RecenterButton = memo(function RecenterButton({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap();
  return (
    <button
      onClick={() => userPos && map.setView(userPos, 16, { animate: true })}
      className="absolute bottom-44 right-3 z-[1000] w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center text-primary active:scale-95 transition-transform"
      aria-label="Recenter"
    >
      <Navigation className="w-5 h-5" />
    </button>
  );
});

// Smooth marker with RAF animation
const SmoothFundiMarker = memo(function SmoothFundiMarker({
  mech,
  distanceKm,
  durationMin,
  meta,
  userId,
  onRequest,
}: {
  mech: MechanicLocation;
  distanceKm?: number;
  durationMin?: number;
  meta?: ProfileMeta;
  userId?: string;
  onRequest?: (userId: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const prevPos = useRef<[number, number]>([mech.latitude, mech.longitude]);
  const online = isOnline(mech.updated_at);
  const icon = online ? fundiIconOnline : fundiIconOffline;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const from = prevPos.current;
    const to: [number, number] = [mech.latitude, mech.longitude];
    if (from[0] === to[0] && from[1] === to[1]) return;

    let step = 0;
    const steps = 20;
    let raf: number;
    const animate = () => {
      step++;
      const t = step / steps;
      marker.setLatLng([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      if (step < steps) raf = requestAnimationFrame(animate);
      else prevPos.current = to;
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [mech.latitude, mech.longitude]);

  return (
    <Marker ref={markerRef} position={[mech.latitude, mech.longitude]} icon={icon}>
      <Popup>
        <div className="text-sm space-y-1 min-w-[140px]">
          <div className="font-bold">🔧 {meta?.full_name || "Fundi"}</div>
          {meta?.rating != null && <div className="text-xs">⭐ {Number(meta.rating).toFixed(1)}</div>}
          {meta?.specialties && meta.specialties.length > 0 && (
            <div className="text-[11px] text-muted-foreground">{meta.specialties.slice(0, 2).join(", ")}</div>
          )}
          <div className="flex items-center gap-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
            {online ? "Online" : "Offline"} · {timeAgo(mech.updated_at)}
          </div>
          {distanceKm !== undefined && (
            <div className="text-xs text-muted-foreground">
              📍 {distanceKm.toFixed(1)} km{durationMin != null ? ` · ⏱ ~${durationMin} min` : ""}
            </div>
          )}
          {userId && onRequest && (
            <button
              onClick={() => onRequest(userId)}
              className="mt-2 w-full px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-[0.98] transition"
            >
              Request this Fundi
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
});

function FitBounds({ userPos, mechanics }: { userPos: [number, number] | null; mechanics: MechanicLocation[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const points: [number, number][] = [];
    if (userPos) points.push(userPos);
    mechanics.forEach((m) => points.push([m.latitude, m.longitude]));

    if (points.length >= 2) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16, animate: false });
      fitted.current = true;
    } else if (userPos) {
      map.setView(userPos, 16, { animate: false });
      fitted.current = true;
    }
  }, [userPos, mechanics, map]);

  return null;
}

// OSRM route cache
const routeCache = new Map<string, { coords: [number, number][]; distanceKm: number; durationMin: number }>();

async function fetchOSRMRoute(from: [number, number], to: [number, number]) {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]) {
      const result = {
        coords: data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
        distanceKm: data.routes[0].distance / 1000,
        durationMin: Math.ceil(data.routes[0].duration / 60),
      };
      routeCache.set(key, result);
      return result;
    }
  } catch {}
  return null;
}

const FullMapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const problemFilter = searchParams.get("problem");
  const { user } = useAuth();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [mechanics, setMechanics] = useState<MechanicLocation[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeActive, setRealtimeActive] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const routeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileUserMap, setProfileUserMap] = useState<Record<string, string>>({});
  const [profileMetaMap, setProfileMetaMap] = useState<Record<string, ProfileMeta>>({});

  // User location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => setUserPos(DAR_ES_SALAAM),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setUserPos(DAR_ES_SALAAM);
    }
  }, []);

  const fetchMechanics = useCallback(async () => {
    const { data, error } = await supabase
      .from("mechanic_locations")
      .select("mechanic_id, latitude, longitude, updated_at");
    setDbConnected(!error);
    if (data) setMechanics(data);
    setLoading(false);
  }, []);

  // Resolve mechanic_profiles.id -> user_id so we can target requests at a specific fundi
  useEffect(() => {
    const ids = mechanics.map((m) => m.mechanic_id).filter((id) => id && !profileUserMap[id]);
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("mechanic_profiles")
        .select("id, user_id, full_name, rating, specialties")
        .in("id", ids);
      if (!data) return;
      setProfileUserMap((prev) => {
        const next = { ...prev };
        data.forEach((p) => { if (p.user_id) next[p.id] = p.user_id; });
        return next;
      });
      setProfileMetaMap((prev) => {
        const next = { ...prev };
        data.forEach((p) => {
          next[p.id] = {
            user_id: p.user_id,
            full_name: p.full_name,
            rating: p.rating,
            specialties: (p.specialties as string[] | null) || [],
          };
        });
        return next;
      });
    })();
  }, [mechanics, profileUserMap]);

  const handleRequestMechanic = useCallback((mechanicUserId: string) => {
    const qs = new URLSearchParams({ mechanicId: mechanicUserId });
    if (problemFilter) qs.set("problem", problemFilter);
    navigate(`/select-problem?${qs.toString()}`);
  }, [navigate, problemFilter]);

  const visibleMechanics = useMemo(() => {
    if (!userPos) return mechanics;
    let pool = mechanics.filter((m) => isOnline(m.updated_at));
    if (problemFilter) {
      pool = pool.filter((m) => {
        const meta = profileMetaMap[m.mechanic_id];
        if (!meta?.specialties?.length) return false;
        return meta.specialties.some((s) => s?.toLowerCase().includes(problemFilter.toLowerCase()));
      });
    }
    pool.sort(
      (a, b) =>
        haversineDistance(userPos[0], userPos[1], a.latitude, a.longitude) -
        haversineDistance(userPos[0], userPos[1], b.latitude, b.longitude)
    );
    return problemFilter ? pool.slice(0, 3) : pool;
  }, [mechanics, userPos, problemFilter, profileMetaMap]);

  useEffect(() => {
    fetchMechanics();
    const channel = supabase
      .channel("all-mechanics-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "mechanic_locations" }, (payload) => {
        const updated = payload.new as MechanicLocation;
        if (!updated?.mechanic_id) return;
        setMechanics((prev) => {
          const idx = prev.findIndex((m) => m.mechanic_id === updated.mechanic_id);
          if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
          return [...prev, updated];
        });
      })
      .subscribe((status) => setRealtimeActive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [fetchMechanics]);

  // Polling fallback
  useEffect(() => {
    if (realtimeActive) return;
    const iv = setInterval(fetchMechanics, 5000);
    return () => clearInterval(iv);
  }, [realtimeActive, fetchMechanics]);

  // Simulation
  useEffect(() => {
    if (!SIMULATE || !userPos) return;
    setMechanics((prev) => {
      if (prev.length > 0) return prev;
      return [{ mechanic_id: "sim-fundi-1", latitude: userPos[0] + 0.012, longitude: userPos[1] + 0.008, updated_at: new Date().toISOString() }];
    });
    const iv = setInterval(() => {
      setMechanics((prev) => prev.map((m) => ({
        ...m,
        latitude: m.latitude + (userPos[0] - m.latitude) * 0.08 + (Math.random() - 0.5) * 0.0005,
        longitude: m.longitude + (userPos[1] - m.longitude) * 0.08 + (Math.random() - 0.5) * 0.0005,
        updated_at: new Date().toISOString(),
      })));
    }, 5000);
    return () => clearInterval(iv);
  }, [userPos]);

  // OSRM routes (debounced)
  useEffect(() => {
    if (!userPos || mechanics.length === 0) return;
    if (routeDebounce.current) clearTimeout(routeDebounce.current);
    routeDebounce.current = setTimeout(async () => {
      const sorted = [...mechanics]
        .filter((m) => isOnline(m.updated_at))
        .sort((a, b) => haversineDistance(userPos[0], userPos[1], a.latitude, a.longitude) - haversineDistance(userPos[0], userPos[1], b.latitude, b.longitude))
        .slice(0, 3);
      const newRoutes: RouteInfo[] = [];
      for (const m of sorted) {
        const route = await fetchOSRMRoute(userPos, [m.latitude, m.longitude]);
        if (route) newRoutes.push({ mechanic_id: m.mechanic_id, ...route });
        else {
          const dist = haversineDistance(userPos[0], userPos[1], m.latitude, m.longitude) / 1000;
          newRoutes.push({ mechanic_id: m.mechanic_id, coords: [userPos, [m.latitude, m.longitude]], distanceKm: dist, durationMin: Math.max(1, Math.round(dist / 30 * 60)) });
        }
      }
      setRoutes(newRoutes);
    }, 1200);
    return () => { if (routeDebounce.current) clearTimeout(routeDebounce.current); };
  }, [userPos, mechanics]);

  const onlineCount = mechanics.filter((m) => isOnline(m.updated_at)).length;
  const nearestRoute = useMemo(() => routes.length ? routes.reduce((b, r) => r.distanceKm < b.distanceKm ? r : b, routes[0]) : null, [routes]);
  const routeDistMap = useMemo(() => { const m = new Map<string, number>(); routes.forEach((r) => m.set(r.mechanic_id, r.distanceKm)); return m; }, [routes]);
  const routeDurMap = useMemo(() => { const m = new Map<string, number>(); routes.forEach((r) => m.set(r.mechanic_id, r.durationMin)); return m; }, [routes]);

  return (
    <div className="fixed inset-0 bg-background">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-background/80 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}

      <MapContainer
        center={DAR_ES_SALAAM}
        zoom={16}
        maxZoom={19}
        className="w-full h-full z-0"
        zoomControl={false}
        scrollWheelZoom={true}
        zoomSnap={0.25}
        zoomDelta={1}
        wheelPxPerZoomLevel={60}
        inertia={true}
        inertiaDeceleration={3000}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        style={{ position: "absolute", inset: 0 }}
      >
        <TileLayer
          attribution={TILE_ATTR}
          url={TILE_URL}
          maxZoom={20}
          tileSize={256}
          detectRetina={true}
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={4}
        />
        <FitBounds userPos={userPos} mechanics={mechanics} />

        {routes.map((r) => (
          <Polyline
            key={r.mechanic_id}
            positions={r.coords}
            pathOptions={{ color: "hsl(217, 91%, 60%)", weight: 5, opacity: 0.8, lineCap: "round", lineJoin: "round" }}
          />
        ))}

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup><div className="font-semibold text-sm">📍 You</div></Popup>
          </Marker>
        )}

        {visibleMechanics.map((m) => (
          <SmoothFundiMarker
            key={m.mechanic_id}
            mech={m}
            distanceKm={routeDistMap.get(m.mechanic_id)}
            durationMin={routeDurMap.get(m.mechanic_id)}
            meta={profileMetaMap[m.mechanic_id]}
            userId={profileUserMap[m.mechanic_id]}
            onRequest={handleRequestMechanic}
          />
        ))}

        <RecenterButton userPos={userPos} />
        <ZoomControls />
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] safe-top">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card/90 backdrop-blur shadow border border-border flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-card/90 backdrop-blur rounded-full px-4 py-2.5 shadow border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search mechanics...</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur rounded-full px-3 py-2 shadow border border-border">
            <span className={`w-2.5 h-2.5 rounded-full ${dbConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[10px] font-medium text-muted-foreground">{dbConnected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-6 px-4">
        <div className="bg-card/95 backdrop-blur rounded-2xl shadow-xl border border-border overflow-hidden">
          {nearestRoute && (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{nearestRoute.distanceKm.toFixed(1)} km</div>
                  <div className="text-[10px] text-muted-foreground">Road distance</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  ~{nearestRoute.durationMin} min
                </div>
                <div className="text-[10px] text-muted-foreground">ETA</div>
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">Nearby Mechanics</h3>
                <p className="text-[10px] text-muted-foreground">{loading ? "Loading..." : `${mechanics.length} found · ${onlineCount} online`}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                <span className={`w-2 h-2 rounded-full ${realtimeActive ? "bg-primary animate-pulse" : "bg-destructive"}`} />
                {realtimeActive ? "Live" : "Polling"}
              </span>
            </div>
            {mechanics.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mt-2 pb-1 -mx-1 px-1">
                {mechanics.slice(0, 5).map((m) => {
                  const online = isOnline(m.updated_at);
                  const ri = routes.find((r) => r.mechanic_id === m.mechanic_id);
                  return (
                    <div key={m.mechanic_id} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl border border-border/50">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        </div>
                        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-card ${online ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <div className="text-[11px]">
                        <div className="font-medium text-foreground">Fundi</div>
                        <div className="text-muted-foreground">{ri ? `${ri.distanceKm.toFixed(1)}km · ${ri.durationMin}min` : online ? "Online" : timeAgo(m.updated_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullMapPage;
