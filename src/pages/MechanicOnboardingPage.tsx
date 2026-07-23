import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, MapPin, Wrench, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083];

const SPECIALTIES = [
  { id: "engine", label: "Engine repair" },
  { id: "tire", label: "Tire change" },
  { id: "battery", label: "Battery issues" },
  { id: "electrical", label: "Electrical problems" },
  { id: "other", label: "Other" },
];

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  nida_number: z.string().trim().min(4, "NIDA number is required").max(40),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  experience_years: z.number().int().min(0).max(80),
  garage_location: z.string().trim().min(2, "Garage location required").max(200),
  specialties: z.array(z.string()).min(1, "Select at least one specialty"),
});

const MechanicOnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [nida, setNida] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState<number | "">("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [garageLocation, setGarageLocation] = useState("Dar es Salaam, Tanzania");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -6.7924, lng: 39.2083 });
  const [mapCenter, setMapCenter] = useState<[number, number]>(DAR_ES_SALAAM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Prefill from existing profile if any
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { profile: data } = await api.get<{ profile: any | null }>("/mechanics/me");
        if (data) {
          if (data.approval_status === "approved") {
            navigate("/mechanic/dashboard", { replace: true });
            return;
          }
          setProfileStatus(data.approval_status ?? "pending");
          setFullName(data.full_name ?? "");
          setNida(data.nida_number ?? "");
          setPhone(data.phone ?? "");
          setEmail(data.email ?? user.email ?? "");
          setExperience(data.experience_years ?? "");
          setSpecialties(data.specialties ?? []);
          setGarageLocation(data.garage_location ?? "Dar es Salaam, Tanzania");
          if (data.lat && data.lng) setCoords({ lat: data.lat, lng: data.lng });
          const imgPath = data.profile_image_url;
          if (imgPath) setPhotoPreview(imgPath);
        }
      } catch {
        // allow user to re-enter details if the profile fetch fails
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, [user, navigate]);

  const toggleSpecialty = (id: string) => {
    setSpecialties((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        setMapCenter([newCoords.lat, newCoords.lng]);
        toast.success("Location captured from GPS");
        setLocating(false);
      },
      () => {
        toast.error("Could not get location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // DraggableMarker component for the map picker
  const DraggableMarker = () => {
    const markerRef = useRef<L.Marker>(null);
    
    useMapEvents({
      click(e) {
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });

    return (
      <Marker
        draggable={true}
        position={[coords.lat, coords.lng]}
        ref={markerRef}
        eventHandlers={{
          dragend() {
            const marker = markerRef.current;
            if (marker) {
              const pos = marker.getLatLng();
              setCoords({ lat: pos.lat, lng: pos.lng });
            }
          },
        }}
      />
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    const parsed = schema.safeParse({
      full_name: fullName,
      nida_number: nida,
      email,
      phone,
      experience_years: typeof experience === "number" ? experience : Number(experience),
      garage_location: garageLocation,
      specialties,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      // Upload photo if new
      let imageUrl: string | null = photoPreview && photoPreview.startsWith("http") ? photoPreview : null;
      if (photoFile) {
        const form = new FormData();
        form.append("photo", photoFile);
        const { url } = await api.upload<{ url: string }>("/mechanics/me/photo", form);
        imageUrl = url;
      }

      await api.post("/mechanics/register", {
        ...parsed.data,
        lat: coords.lat,
        lng: coords.lng,
        profile_image_url: imageUrl,
      });

      toast.success("Registration complete!");
      navigate("/mechanic/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">Mechanic Registration</h1>
          <p className="text-xs text-muted-foreground">Complete your profile to start receiving jobs</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="p-5 space-y-5 pb-32 max-w-md mx-auto">
        {profileStatus === "pending" && (
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4 text-sm text-warning-foreground">
            Your mechanic registration is pending review. You can update your details while you wait.
          </div>
        )}
        {profileStatus === "rejected" && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive-foreground">
            Your previous registration was rejected. Please review and submit again.
          </div>
        )}
        {/* Profile photo */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border overflow-hidden flex items-center justify-center"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-7 h-7 text-muted-foreground" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-semibold py-0.5">
              {photoPreview ? "Change" : "Upload"}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Mwangi" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nida">NIDA Number *</Label>
          <Input id="nida" value={nida} onChange={(e) => setNida(e.target.value)} placeholder="19900101-12345-12345-12" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 712 345 678" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp">Years of Experience *</Label>
          <Input
            id="exp"
            type="number"
            min={0}
            max={80}
            value={experience}
            onChange={(e) => setExperience(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="5"
          />
        </div>

        <div className="space-y-2">
          <Label>Specialties *</Label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => {
              const active = specialties.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSpecialty(s.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Garage Location *</Label>
          <Textarea
            value={garageLocation}
            onChange={(e) => setGarageLocation(e.target.value)}
            placeholder="Street, neighborhood, city"
            rows={2}
          />
          
          {/* Map picker for location */}
          <div className="rounded-2xl overflow-hidden border border-border h-[250px] mt-2">
            <MapContainer
              center={mapCenter}
              zoom={14}
              className="w-full h-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DraggableMarker />
            </MapContainer>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Drag the marker or click on the map to set your location
            </p>
            <p className="text-xs font-medium text-foreground">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          </div>
          
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="text-xs text-primary flex items-center gap-1.5 mt-1 hover:underline"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? "Getting location..." : "Use my current location"}
          </button>
        </div>

        <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Registration"}
        </Button>
      </form>
    </div>
  );
};

export default MechanicOnboardingPage;
