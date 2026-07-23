import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const clientIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(0,85%,55%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -18],
});

const mechanicIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:hsl(210,100%,50%);border:3px solid white;box-shadow:0 0 0 5px hsla(210,100%,50%,0.2), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ clientPos, mechanicPos }: { clientPos: [number, number]; mechanicPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (mechanicPos) {
      map.fitBounds([clientPos, mechanicPos], { padding: [40, 40] });
    } else {
      map.setView(clientPos, 14);
    }
  }, [clientPos, mechanicPos, map]);
  return null;
}

interface ClientLocationMapProps {
  clientLat: number;
  clientLng: number;
  clientName: string;
  onClose: () => void;
}

const ClientLocationMap = ({ clientLat, clientLng, clientName, onClose }: ClientLocationMapProps) => {
  const [mechanicPos, setMechanicPos] = useState<[number, number] | null>(null);
  const clientPos: [number, number] = [clientLat, clientLng];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMechanicPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${clientLat},${clientLng}&travelmode=driving`,
      "_blank"
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-info/40 bg-card">
      {/* Map header */}
      <div className="flex items-center justify-between px-3 py-2 bg-info/10">
        <span className="text-xs font-semibold text-info flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" />
          {clientName}'s Location
        </span>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-foreground" />
        </button>
      </div>

      {/* Map */}
      <div className="h-52 w-full">
        <MapContainer
          center={clientPos}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds clientPos={clientPos} mechanicPos={mechanicPos} />
          <Marker position={clientPos} icon={clientIcon}>
            <Popup>{clientName}</Popup>
          </Marker>
          {mechanicPos && (
            <Marker position={mechanicPos} icon={mechanicIcon}>
              <Popup>You</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Google Maps button */}
      <div className="p-2">
        <Button size="sm" className="w-full bg-info hover:bg-info/90 text-white" onClick={openGoogleMaps}>
          <Navigation className="w-4 h-4" />
          Open in Google Maps
        </Button>
      </div>
    </div>
  );
};

export default ClientLocationMap;
