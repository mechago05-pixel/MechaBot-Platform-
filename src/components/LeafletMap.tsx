import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, Star, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];

const activeIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(145,72%,35%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

const offlineIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(0,0%,60%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

const userIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:hsl(210,100%,50%);border:3px solid white;box-shadow:0 0 0 6px hsla(210,100%,50%,0.2), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MechanicLocation {
  id: string;
  mechanic_id: string;
  latitude: number;
  longitude: number;
  // joined from mechanic_profiles
  mechanic_name?: string;
  specialties?: string[];
  is_online?: boolean;
  rating?: number;
  experience_years?: number;
  tier?: string;
}

function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(coords);
          map.setView(coords, map.getZoom());
        },
        () => {
          // fallback to Dar es Salaam
          setPosition(DAR_ES_SALAAM);
        }
      );
    }
  }, [map]);

  if (!position) return null;
  return <Marker position={position} icon={userIcon}><Popup>Your location</Popup></Marker>;
}

interface LeafletMapProps {
  fullScreen?: boolean;
}

const LeafletMap = ({ fullScreen = false }: LeafletMapProps) => {
  const { t } = useI18n();
  const [mechanics, setMechanics] = useState<MechanicLocation[]>([]);
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);

  // Fetch mechanic locations joined with profiles
  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("mechanic_locations")
      .select(`
        id,
        mechanic_id,
        latitude,
        longitude,
        mechanic_profiles!inner (
          user_id,
          specialties,
          is_online,
          rating,
          experience_years,
          tier
        )
      `);

    if (error) {
      console.error("Error fetching mechanic locations:", error);
      return;
    }

    if (data) {
      // Also fetch profile names
      const userIds = data.map((d: any) => d.mechanic_profiles?.user_id).filter(Boolean);
      let profileMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
        }
      }

      const mapped: MechanicLocation[] = data.map((d: any) => ({
        id: d.id,
        mechanic_id: d.mechanic_id,
        latitude: d.latitude,
        longitude: d.longitude,
        mechanic_name: profileMap[d.mechanic_profiles?.user_id] || "Mechanic",
        specialties: d.mechanic_profiles?.specialties || [],
        is_online: d.mechanic_profiles?.is_online ?? false,
        rating: d.mechanic_profiles?.rating ?? 0,
        experience_years: d.mechanic_profiles?.experience_years ?? 0,
        tier: d.mechanic_profiles?.tier || "silver",
      }));
      setMechanics(mapped);
    }
  };

  useEffect(() => {
    fetchLocations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("mechanic_locations_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mechanic_locations" },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const updated = payload.new as any;
            setMechanics((prev) => {
              const idx = prev.findIndex((m) => m.mechanic_id === updated.mechanic_id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], latitude: updated.latitude, longitude: updated.longitude };
                return copy;
              }
              // New mechanic — refetch all to get joined data
              fetchLocations();
              return prev;
            });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            setMechanics((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = filterSpecialty
    ? mechanics.filter((m) => m.specialties?.includes(filterSpecialty))
    : mechanics;

  const specialties = Array.from(new Set(mechanics.flatMap((m) => m.specialties || [])));

  const openGoogleMapsNav = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  return (
    <div className={`relative w-full ${fullScreen ? "h-[calc(100vh-120px)]" : "h-64"} rounded-2xl overflow-hidden border border-border`}>
      <MapContainer
        center={DAR_ES_SALAAM}
        zoom={12}
        className="w-full h-full z-0"
        zoomControl={fullScreen}
        scrollWheelZoom={true}
        style={{ borderRadius: "inherit" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <UserLocationMarker />

        {filtered.map((mech) => (
          <Marker
            key={mech.id}
            position={[mech.latitude, mech.longitude]}
            icon={mech.is_online ? activeIcon : offlineIcon}
          >
            <Popup>
              <div className="min-w-[180px] p-1">
                <h4 className="font-bold text-sm">{mech.mechanic_name}</h4>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <span>⭐ {mech.rating?.toFixed(1)}</span>
                  <span>•</span>
                  <span>{mech.experience_years} yrs exp</span>
                  <span>•</span>
                  <span className={mech.is_online ? "text-primary font-semibold" : "text-muted-foreground"}>
                    {mech.is_online ? "Online" : "Offline"}
                  </span>
                </div>
                {mech.specialties && mech.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {mech.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium capitalize">
                        {s.replace("-", " ")}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => openGoogleMapsNav(mech.latitude, mech.longitude)}
                  className="mt-2 w-full text-xs bg-accent text-accent-foreground rounded px-2 py-1 font-medium hover:brightness-110 transition-colors"
                >
                  Navigate →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Specialty filter chips (fullscreen only) */}
      {fullScreen && specialties.length > 0 && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterSpecialty(null)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              !filterSpecialty
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/90 text-foreground border-border backdrop-blur-sm"
            }`}
          >
            All
          </button>
          {specialties.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSpecialty(filterSpecialty === s ? null : s)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                filterSpecialty === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/90 text-foreground border-border backdrop-blur-sm"
              }`}
            >
              {s.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 bg-card/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-border text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Online</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" /> Offline</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-info inline-block" /> You</span>
      </div>
    </div>
  );
};

export default LeafletMap;
