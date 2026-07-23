import { useEffect, useState, useRef, useCallback, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";
import { Clock, MapPin } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const mechanicIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>`,
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

function FitView({ userPos, mechPos }: { userPos: [number, number] | null; mechPos: [number, number] | null }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    if (userPos && mechPos) {
      map.fitBounds([userPos, mechPos], { padding: [50, 50], maxZoom: 16, animate: false });
      fitted.current = true;
    } else if (userPos) {
      map.setView(userPos, 16, { animate: false });
      fitted.current = true;
    }
  }, [userPos, mechPos, map]);
  return null;
}

const SmoothMarker = memo(function SmoothMarker({ position, icon, popupText }: { position: [number, number]; icon: L.DivIcon; popupText: string }) {
  const markerRef = useRef<L.Marker | null>(null);
  const prevPos = useRef<[number, number]>(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const from = prevPos.current;
    const to = position;
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
  }, [position]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      <Popup><div className="font-semibold text-sm">{popupText}</div></Popup>
    </Marker>
  );
});

interface LiveTrackingMapProps {
  mechanicId: string;
  className?: string;
}

const LiveTrackingMap = ({ mechanicId, className = "" }: LiveTrackingMapProps) => {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [mechPos, setMechPos] = useState<[number, number] | null>(null);
  const [routeLine, setRouteLine] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const fetchRoute = useCallback(async (from: [number, number], to: [number, number]) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]) {
        setRouteLine(data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]));
        setRouteDistance(data.routes[0].distance / 1000);
        setRouteDuration(Math.ceil(data.routes[0].duration / 60));
      }
    } catch {
      setRouteLine([from, to]);
      setRouteDistance(L.latLng(from[0], from[1]).distanceTo(L.latLng(to[0], to[1])) / 1000);
      setRouteDuration(null);
    }
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => setUserPos(DAR_ES_SALAAM),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else { setUserPos(DAR_ES_SALAAM); }
  }, []);

  useEffect(() => {
    if (userPos && mechPos) fetchRoute(userPos, mechPos);
  }, [userPos, mechPos, fetchRoute]);

  useEffect(() => {
    if (!mechanicId) return;
    const fetchLocation = async () => {
      try {
        const res = await api.get<{ latitude: number; longitude: number } | null>(`/mechanics/${mechanicId}/location`);
        if (res) {
          setMechPos([res.latitude, res.longitude]);
        }
      } catch (err) {
        console.error("Failed to fetch mechanic location:", err);
      }
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [mechanicId]);

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-border ${className}`}>
      {!mapReady && (
        <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <MapContainer
        center={DAR_ES_SALAAM}
        zoom={16}
        maxZoom={19}
        className="w-full h-full z-0"
        zoomControl={true}
        scrollWheelZoom={true}
        zoomSnap={0.25}
        zoomDelta={1}
        wheelPxPerZoomLevel={60}
        inertia={true}
        fadeAnimation={true}
        whenReady={() => setMapReady(true)}
        style={{ borderRadius: "inherit", minHeight: "300px" }}
      >
        <TileLayer
          attribution='&copy; OSM &copy; CARTO'
          url={TILE_URL}
          maxZoom={20}
          tileSize={256}
          detectRetina={true}
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={4}
        />
        <FitView userPos={userPos} mechPos={mechPos} />

        {routeLine.length >= 2 && (
          <Polyline positions={routeLine} pathOptions={{ color: "hsl(217, 91%, 60%)", weight: 5, opacity: 0.8 }} />
        )}

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup><div className="font-semibold text-sm">📍 Mahali pako</div></Popup>
          </Marker>
        )}

        {mechPos && <SmoothMarker position={mechPos} icon={mechanicIcon} popupText="🔧 Fundi yuko hapa" />}
      </MapContainer>

      {/* Info bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-t border-border">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[hsl(142,71%,45%)] inline-block border border-white shadow-sm" /> Wewe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary inline-block border border-white shadow-sm" /> Fundi
          </span>
        </div>
        {routeDistance !== null && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MapPin className="w-3 h-3" /> {routeDistance.toFixed(1)} km
            {routeDuration !== null && (
              <><Clock className="w-3 h-3 ml-1" /> ~{routeDuration} min</>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingMap;
