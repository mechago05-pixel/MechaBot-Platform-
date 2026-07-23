import { useState, lazy, Suspense } from "react";
import { Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LeafletMiniMap = lazy(() => import("@/components/LeafletMiniMap"));

interface MapViewProps {
  fullScreen?: boolean;
}

const MapView = ({ fullScreen = false }: MapViewProps) => {
  const navigate = useNavigate();

  return (
    <div className={`relative w-full ${fullScreen ? "h-[calc(100vh-120px)]" : "h-52"} rounded-2xl overflow-hidden border border-border`}>
      <Suspense fallback={
        <div className="w-full h-full bg-secondary flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <LeafletMiniMap />
      </Suspense>

      {!fullScreen && (
        <button
          onClick={() => navigate("/map")}
          className="absolute top-3 right-3 z-[1000] w-8 h-8 rounded-lg bg-card/90 backdrop-blur border border-border flex items-center justify-center text-foreground"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default MapView;
