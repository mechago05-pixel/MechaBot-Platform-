import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Distance thresholds in meters
const THRESHOLDS = [
  { dist: 2000, key: "2km", message: "Fundi yupo njiani, anakaribia eneo lako." },
  { dist: 500, key: "500m", message: "Fundi amekaribia eneo lako!" },
  { dist: 100, key: "100m", message: "Fundi amefika kwenye site." },
] as const;

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useLocationTriggers(clientUserId: string | undefined) {
  const firedRef = useRef<Set<string>>(new Set());

  const checkDistance = useCallback(
    async (
      fundiLat: number,
      fundiLng: number,
      userLat: number,
      userLng: number
    ) => {
      if (!clientUserId) return;
      const dist = haversineDistance(userLat, userLng, fundiLat, fundiLng);

      for (const t of THRESHOLDS) {
        if (dist <= t.dist && !firedRef.current.has(t.key)) {
          firedRef.current.add(t.key);
          // Insert notification for client
          await supabase.from("notifications").insert({
            user_id: clientUserId,
            type: "info",
            message: t.message,
          });
        }
      }
    },
    [clientUserId]
  );

  const resetTriggers = useCallback(() => {
    firedRef.current.clear();
  }, []);

  return { checkDistance, resetTriggers, haversineDistance };
}

export { haversineDistance };
