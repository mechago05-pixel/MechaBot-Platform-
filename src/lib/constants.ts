import { Wrench, Zap, Snowflake, Cog, CircuitBoard, Car, HelpCircle, Disc, Battery, Lightbulb, Thermometer, Volume2, Fuel } from "lucide-react";

export const PROBLEM_CATEGORIES = [
  { id: "engine", label: "Engine Problem", description: "Car shakes, loses power, or makes rough sounds", icon: Cog, color: "hsl(0 72% 51%)", basePrice: 30000 },
  { id: "battery", label: "Battery Issue", description: "Car won't start or battery light is on", icon: Battery, color: "hsl(38 92% 50%)", basePrice: 20000 },
  { id: "flat-tire", label: "Flat Tire", description: "Tire is flat, leaking air, or damaged", icon: Car, color: "hsl(210 80% 55%)", basePrice: 15000 },
  { id: "not-starting", label: "Car Not Starting", description: "Key turns but nothing happens", icon: Zap, color: "hsl(48 100% 52%)", basePrice: 25000 },
  { id: "brakes", label: "Brake Problem", description: "Squeaking, grinding, or brakes feel soft", icon: Disc, color: "hsl(270 60% 55%)", basePrice: 28000 },
  { id: "oil-change", label: "Oil Change", description: "Routine oil change or oil light is on", icon: Fuel, color: "hsl(30 80% 50%)", basePrice: 15000 },
  { id: "overheating", label: "Overheating", description: "Temperature gauge is high or steam from hood", icon: Thermometer, color: "hsl(0 90% 60%)", basePrice: 35000 },
  { id: "strange-noise", label: "Strange Noise", description: "Unusual sounds from engine, wheels, or exhaust", icon: Volume2, color: "hsl(190 80% 50%)", basePrice: 22000 },
  { id: "lights", label: "Lights Problem", description: "Headlights, tail lights, or dashboard warning lights", icon: Lightbulb, color: "hsl(55 90% 55%)", basePrice: 18000 },
  { id: "other", label: "Other Problem", description: "Something else not listed above", icon: HelpCircle, color: "hsl(152 60% 45%)", basePrice: 25000 },
] as const;

export type ProblemCategory = typeof PROBLEM_CATEGORIES[number]["id"];

export type VehicleSize = "small" | "medium" | "large";

export const VEHICLE_SIZE_MULTIPLIERS: Record<VehicleSize, { min: number; max: number }> = {
  small: { min: 0.8, max: 1.2 },
  medium: { min: 1.0, max: 1.5 },
  large: { min: 1.3, max: 1.7 },
};

export interface Mechanic {
  id: string;
  name: string;
  photo: string;
  specializations: ProblemCategory[];
  rating: number;
  reviews: number;
  distance: number;
  price: number;
  experience: number;
  lat: number;
  lng: number;
  phone: string;
  available: boolean;
}

export const MOCK_MECHANICS: Mechanic[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    specializations: ["engine", "not-starting"],
    rating: 4.9,
    reviews: 234,
    distance: 1.2,
    price: 85,
    experience: 12,
    lat: 25.2048,
    lng: 55.2708,
    phone: "+971501234567",
    available: true,
  },
  {
    id: "2",
    name: "Carlos Rivera",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    specializations: ["brakes", "flat-tire"],
    rating: 4.7,
    reviews: 189,
    distance: 2.5,
    price: 70,
    experience: 8,
    lat: 25.2100,
    lng: 55.2750,
    phone: "+971502345678",
    available: true,
  },
  {
    id: "3",
    name: "James Mitchell",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    specializations: ["battery", "lights"],
    rating: 4.8,
    reviews: 156,
    distance: 3.1,
    price: 95,
    experience: 15,
    lat: 25.1980,
    lng: 55.2650,
    phone: "+971503456789",
    available: false,
  },
  {
    id: "4",
    name: "Omar Khalil",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    specializations: ["engine", "overheating", "oil-change"],
    rating: 4.6,
    reviews: 98,
    distance: 0.8,
    price: 75,
    experience: 6,
    lat: 25.2020,
    lng: 55.2680,
    phone: "+971504567890",
    available: true,
  },
];

export type JobStatus = "pending" | "accepted" | "on_the_way" | "arrived" | "diagnosis" | "repair" | "completed" | "cancelled";

export const JOB_STATUSES: { id: JobStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "on_the_way", label: "On the Way" },
  { id: "arrived", label: "Arrived" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "repair", label: "Repair" },
  { id: "completed", label: "Completed" },
];

/** Auto-prioritize mechanics by matching specializations */
export function matchMechanics(category: ProblemCategory): Mechanic[] {
  const sorted = [...MOCK_MECHANICS]
    .filter((m) => m.available)
    .sort((a, b) => {
      const aMatch = a.specializations.includes(category) ? 1 : 0;
      const bMatch = b.specializations.includes(category) ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return a.distance - b.distance;
    });
  return sorted;
}
