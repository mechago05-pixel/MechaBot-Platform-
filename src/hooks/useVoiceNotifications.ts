import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n, type Language } from "@/lib/i18n";
import { getNotifSettings } from "@/hooks/useBrowserNotifications";

/**
 * Voice notifications — reads incoming notifications aloud using the device's
 * native Web Speech API TTS engine in the user's selected app language.
 * Queues messages so they never overlap.
 */

type VoiceEvent =
  // Customer-facing
  | "customer.accepted"
  | "customer.on_the_way"
  | "customer.arrived"
  | "customer.completed"
  | "customer.cancelled"
  // Mechanic-facing
  | "mechanic.new_request"
  | "mechanic.location_updated"
  | "mechanic.customer_cancelled"
  | "mechanic.completed";

const templates: Record<VoiceEvent, Record<Language, (name: string) => string>> = {
  "customer.accepted": {
    en: (n) => `${n}, your mechanic has accepted your request.`,
    sw: (n) => `${n}, fundi wako amekubali ombi lako.`,
  },
  "customer.on_the_way": {
    en: (n) => `${n}, your mechanic is on the way.`,
    sw: (n) => `${n}, fundi wako yupo njiani.`,
  },
  "customer.arrived": {
    en: (n) => `${n}, your mechanic has arrived.`,
    sw: (n) => `${n}, fundi wako amewasili.`,
  },
  "customer.completed": {
    en: (n) => `${n}, your service has been completed.`,
    sw: (n) => `${n}, huduma yako imekamilika.`,
  },
  "customer.cancelled": {
    en: (n) => `${n}, your request has been cancelled.`,
    sw: (n) => `${n}, ombi lako limeghairiwa.`,
  },
  "mechanic.new_request": {
    en: (n) => `${n}, you have a new service request.`,
    sw: (n) => `${n}, una ombi jipya la huduma.`,
  },
  "mechanic.location_updated": {
    en: (n) => `${n}, the customer updated their location.`,
    sw: (n) => `${n}, mteja amebadilisha eneo lake.`,
  },
  "mechanic.customer_cancelled": {
    en: (n) => `${n}, the customer cancelled the request.`,
    sw: (n) => `${n}, mteja amekughairi.`,
  },
  "mechanic.completed": {
    en: (n) => `${n}, the service has been completed.`,
    sw: (n) => `${n}, huduma imekamilika.`,
  },
};

/**
 * Map an incoming notification (currently written in Swahili by DB triggers)
 * to a canonical voice event. Uses distinctive keywords so it works whatever
 * the source language.
 */
function detectEvent(message: string, role: string | null): VoiceEvent | null {
  const m = message.toLowerCase();
  const isMechanic = role === "mechanic" || role === "admin";

  if (isMechanic) {
    if (m.includes("ombi jipya") || m.includes("new service request") || m.includes("new request")) return "mechanic.new_request";
    if (m.includes("amebadilisha eneo") || m.includes("updated their location") || m.includes("location update")) return "mechanic.location_updated";
    if (m.includes("amekughairi") || m.includes("imeghairiwa na mteja") || m.includes("customer cancelled")) return "mechanic.customer_cancelled";
    if (m.includes("imekamilika") || m.includes("completed")) return "mechanic.completed";
    return null;
  }

  // Customer
  if (m.includes("amekubali")) return "customer.accepted";
  if (m.includes("anaelekea") || m.includes("yupo njiani") || m.includes("on the way")) return "customer.on_the_way";
  if (m.includes("amefika") || m.includes("amewasili") || m.includes("arrived")) return "customer.arrived";
  if (m.includes("imekamilika") || m.includes("amemaliza") || m.includes("completed")) return "customer.completed";
  if (m.includes("imeghairiwa") || m.includes("cancelled")) return "customer.cancelled";
  return null;
}

/** Locate a voice that matches the requested BCP-47 language prefix. */
function pickVoice(lang: Language): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang === "sw" ? "sw" : "en";
  // Prefer exact match then any voice starting with the prefix.
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix + "-")) ||
    voices.find((v) => v.lang.toLowerCase() === prefix) ||
    voices.find((v) => v.lang.toLowerCase().includes(prefix)) ||
    null
  );
}

// Simple FIFO queue so utterances never overlap.
const queue: Array<() => void> = [];
let speaking = false;

function runNext() {
  if (speaking) return;
  const next = queue.shift();
  if (!next) return;
  speaking = true;
  next();
}

function enqueueSpeak(text: string, lang: Language) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "sw" ? "sw-TZ" : "en-US";
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;
    utter.onend = () => {
      speaking = false;
      runNext();
    };
    utter.onerror = () => {
      speaking = false;
      runNext();
    };
    try {
      window.speechSynthesis.speak(utter);
    } catch {
      speaking = false;
      runNext();
    }
  };

  queue.push(speak);
  runNext();
}

export function useVoiceNotifications() {
  const { user } = useAuth();
  const { language } = useI18n();
  const firstNameRef = useRef<string>("");
  const roleRef = useRef<string | null>(null);

  // Preload voices — some browsers only populate the list after this event.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Fetch profile first name + role.
  useEffect(() => {
    if (!user) {
      firstNameRef.current = "";
      roleRef.current = null;
      return;
    }
    (async () => {
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);
      const full = profile?.full_name || user.user_metadata?.full_name || "";
      firstNameRef.current = (full.trim().split(/\s+/)[0] || "").trim();
      roleRef.current = (roleRow?.role as string | null) ?? null;
    })();
  }, [user]);

  const speakNotification = useCallback(
    (message: string) => {
      const settings = getNotifSettings();
      if (!settings.enabled || !settings.voice) return;

      const event = detectEvent(message, roleRef.current);
      const name = firstNameRef.current || (language === "sw" ? "Rafiki" : "Friend");
      const text = event ? templates[event][language](name) : message;
      enqueueSpeak(text, language);
    },
    [language]
  );

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("voice-notif-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as { message: string };
          if (!notif?.message) return;
          speakNotification(notif.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Stop any in-flight speech on unmount / user change.
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      queue.length = 0;
      speaking = false;
    };
  }, [user, speakNotification]);

  return { speakNotification };
}
