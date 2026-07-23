import { useEffect, useRef } from "react";
import { getNotifSettings } from "@/hooks/useBrowserNotifications";

type Order = {
  id: string;
  status: string;
  mechanic_id: string | null;
};

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function unlockAudio() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }
  audioUnlocked = true;
}

function playAlarmSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }

  try {
    const now = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    masterGain.connect(context.destination);

    const createTone = (freq: number, startDelay: number, duration: number) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + startDelay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + startDelay + duration);
      gain.gain.setValueAtTime(0.18, now + startDelay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + startDelay);
      osc.stop(now + startDelay + duration);
    };

    createTone(880, 0, 0.3);
    createTone(1000, 0.12, 0.22);
    createTone(720, 0.35, 0.25);
  } catch {
    // ignore unsupported audio environments
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/placeholder.svg",
      tag: `mechabot-order-${Date.now()}`,
    });
  } catch {
    // ignore invalid notification environments
  }
}

export function useOrderAlarm(orders: Order[], userId: string | undefined) {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const pendingOrders = orders.filter(
      (order) =>
        order.status === "pending" &&
        (order.mechanic_id === null || order.mechanic_id === userId)
    );

    const previousIds = previousIdsRef.current;
    const currentIds = new Set(pendingOrders.map((order) => order.id));

    if (!mountedRef.current) {
      previousIdsRef.current = currentIds;
      mountedRef.current = true;
      return;
    }

    const newPending = pendingOrders.filter((order) => !previousIds.has(order.id));
    if (newPending.length === 0) {
      previousIdsRef.current = currentIds;
      return;
    }

    const settings = getNotifSettings();
    if (settings.enabled && settings.orders) {
      const title = "🔔 New mechanic order";
      const body =
        newPending.length === 1
          ? "A new service request is waiting for you."
          : `There are ${newPending.length} new service requests waiting.`;
      showBrowserNotification(title, body);
      if (audioUnlocked) {
        playAlarmSound();
      } else {
        const onInteraction = () => {
          unlockAudio();
          playAlarmSound();
          window.removeEventListener("click", onInteraction);
          window.removeEventListener("keydown", onInteraction);
        };
        window.addEventListener("click", onInteraction, { once: true });
        window.addEventListener("keydown", onInteraction, { once: true });
      }
    }

    previousIdsRef.current = currentIds;
  }, [orders, userId]);
}
