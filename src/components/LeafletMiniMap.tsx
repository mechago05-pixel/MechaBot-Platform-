import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:hsl(142,71%,45%);border:3px solid white;box-shadow:0 0 0 4px hsla(142,71%,45%,0.2), 0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const LeafletMiniMap = () => {
  const [pos, setPos] = useState<[number, number]>(DAR_ES_SALAAM);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setPos([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  return (
    <MapContainer
      center={pos}
      zoom={15}
      maxZoom={19}
      className="w-full h-full"
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      attributionControl={false}
      style={{ minHeight: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={20}
        tileSize={256}
        detectRetina={true}
        keepBuffer={2}
      />
      <Marker position={pos} icon={userIcon}>
        <Popup><span className="text-xs font-semibold">📍 You</span></Popup>
      </Marker>
    </MapContainer>
  );
};

export default LeafletMiniMap;
