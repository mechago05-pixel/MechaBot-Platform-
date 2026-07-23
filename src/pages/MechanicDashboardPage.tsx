import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Briefcase, Star, Phone, Wrench, MapPin, Diamond, Award, Medal, Map as MapIcon, LogOut, Truck, Sparkles, User, ShieldCheck, MessageSquare, PhoneCall, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useOrderAlarm } from "@/hooks/use-order-alarm";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type MechanicTier = "diamond" | "gold" | "silver";

type MechanicProfile = {
  id: string;
  approval_status: string;
  is_online: boolean;
  full_name: string;
  phone?: string | null;
  profile_image_url?: string | null;
  specialties: string[];
  rating: number | null;
  total_reviews?: number;
  experience_years: number | null;
  tier: MechanicTier;
  garage_location: string | null;
};

const tierConfig: Record<MechanicTier, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  diamond: { icon: Diamond, color: "text-blue-500", bg: "bg-blue-500/10", label: "Diamond Tier" },
  gold: { icon: Award, color: "text-amber-500", bg: "bg-amber-500/10", label: "Gold Tier" },
  silver: { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10", label: "Silver Tier" },
};

const nextSteps = {
  accepted: { status: "on_the_way", label: "Start trip", icon: Truck },
  on_the_way: { status: "arrived", label: "Arrived", icon: MapPin },
  arrived: { status: "diagnosis", label: "Start diagnosis", icon: Search },
  diagnosis: { status: "repair", label: "Start repair", icon: Wrench },
  repair: { status: "completed", label: "Complete order", icon: CheckCircle },
} as const;

const activeStatuses = ["accepted", "on_the_way", "arrived", "diagnosis", "repair"] as const;

const MechanicDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderBusyId, setOrderBusyId] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const response = await api.get<{ profile: MechanicProfile | null }>("/mechanics/me");
      if (!response?.profile) {
        navigate("/mechanic-onboarding", { replace: true });
        return;
      }
      setProfile(response.profile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!user || !profile || profile.approval_status !== "approved") {
      setIncomingOrders([]);
      return;
    }
    setLoadingOrders(true);
    try {
      const requests = await api.get<any[]>("/requests");
      const cutoff = Date.now() - 30_000; // 30 seconds ago
      setIncomingOrders(
        requests.filter((request) => {
          // Client-side safety: discard pending requests older than 30 seconds
          if (request.status === "pending") {
            const createdAt = new Date(request.created_at).getTime();
            if (createdAt < cutoff) return false;
            return request.mechanic_id === null || request.mechanic_id === user.id;
          }
          return request.mechanic_id === user.id;
        })
      );
    } catch {
      setIncomingOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!profile || profile.approval_status !== "approved") return;
    loadOrders();
    const timer = window.setInterval(loadOrders, 10000);
    return () => window.clearInterval(timer);
  }, [profile?.id, profile?.approval_status, user?.id]);

  const hasActiveOrder = incomingOrders.some((o) => activeStatuses.includes(o.status));

  useOrderAlarm(incomingOrders, user?.id);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const updateAvailability = async (nextOnline: boolean) => {
    if (!profile) return;
    setAvailabilityUpdating(true);
    try {
      const response = await api.post<{ is_online: boolean }>("/mechanics/me/availability", { is_online: nextOnline });
      setProfile({ ...profile, is_online: response.is_online });
      toast.success(response.is_online ? "You are now online" : "You are now offline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update availability");
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  const acceptOrder = async (id: string) => {
    if (hasActiveOrder) {
      toast.error("You already have an active order. Complete it first.");
      return;
    }
    setOrderBusyId(id);
    try {
      await api.post(`/requests/${id}/accept`);
      toast.success("Order accepted");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to accept order");
      await loadOrders();
    } finally {
      setOrderBusyId(null);
    }
  };

  const advanceOrder = async (id: string, nextStatus: string) => {
    setOrderBusyId(id);
    try {
      await api.post(`/requests/${id}/status`, { status: nextStatus });
      toast.success("Order status updated");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status");
    } finally {
      setOrderBusyId(null);
    }
  };

  const pendingOrderCount = incomingOrders.filter((o) => o.status === "pending").length;
  const activeOrderCount = incomingOrders.filter((o) => activeStatuses.includes(o.status)).length;
  const totalOrderCount = incomingOrders.length;

  const profileImage = profile?.profile_image_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&crop=face";
  const approvalBadgeClasses = profile?.approval_status === "approved"
    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
    : profile?.approval_status === "pending"
    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
    : "bg-destructive/10 text-destructive border border-destructive/20";

  const fmtLocation = (loc: any) => {
    if (!loc) return "Location unavailable";
    if (typeof loc === "string") return loc;
    if (loc.lat != null && loc.lng != null) return `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}`;
    return "Location";
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.max(0, Date.now() - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  };

  const tier = profile?.tier || "silver";
  const TierIcon = tierConfig[tier].icon;

  return (
    <div className="min-h-screen bg-background/95 pb-12 relative overflow-x-hidden">
      {/* Covered Gradient Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none -z-10" />

      <header className="flex items-center gap-3 p-5 max-w-2xl mx-auto">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
          <Wrench className="w-5 h-5" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground flex-1">{t("mechanicDashboard")}</h1>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={async () => { await signOut(); navigate("/login", { replace: true }); }} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-destructive hover:bg-destructive/10 active:scale-95 transition-all shadow-sm" aria-label="Log out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-5 max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden"
        >
          {/* Inner banner header */}
          <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-card border-b border-border/40" />
          
          <div className="p-5 pt-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 -mt-8 mb-4">
              <img
                src={profileImage}
                alt={profile?.full_name ?? "Mechanic"}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-md shrink-0"
              />
              <div className="flex-1 min-w-0 pt-8 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      <h2 className="font-display font-bold text-foreground text-xl truncate">{profile?.full_name || "Mechanic"}</h2>
                      <span className="flex items-center gap-0.5 text-primary">
                        <ShieldCheck className="w-4 h-4 fill-primary/10" />
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {profile?.garage_location || "No garage location yet"}
                    </p>
                  </div>
                  
                  {/* Availability switch pill */}
                  <div className="flex items-center justify-center gap-2.5 bg-secondary/60 border border-border/50 px-4 py-2 rounded-2xl shrink-0 shadow-sm">
                    <Switch
                      checked={profile?.is_online ?? false}
                      onCheckedChange={updateAvailability}
                      disabled={!profile || profile.approval_status !== "approved" || availabilityUpdating}
                    />
                    <span className={`text-xs font-bold uppercase tracking-wider ${profile?.is_online ? "text-primary" : "text-muted-foreground"}`}>
                      {profile?.is_online ? t("online") : t("offline")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border/40 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-bold text-foreground">{profile?.rating ?? 0}</span>
                    <span className="text-xs text-muted-foreground">({profile?.total_reviews ?? 0} reviews)</span>
                  </div>
                  <span className="hidden sm:inline text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                    <Wrench className="w-3.5 h-3.5 text-primary" />
                    <span>{profile?.experience_years ?? 0} {t("yrsExp")}</span>
                  </div>
                  <span className="hidden sm:inline text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{profile?.phone || "No phone"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${approvalBadgeClasses}`}>
                  {profile?.approval_status || "pending"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {profile?.approval_status === "approved"
                    ? "Ready to receive jobs"
                    : profile?.approval_status === "pending"
                    ? "Waiting for admin approval"
                    : "Please resubmit profile"}
                </span>
              </div>
              
              {/* Tier Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${tierConfig[tier].bg} border border-border/10`}>
                <TierIcon className={`w-3.5 h-3.5 ${tierConfig[tier].color}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${tierConfig[tier].color}`}>
                  {tierConfig[tier].label}
                </span>
              </div>
            </div>

            {profile?.specialties?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border/40">
                {profile.specialties.map((skill) => (
                  <span key={skill} className="text-[10px] bg-secondary border border-border/50 text-foreground/80 px-2.5 py-1 rounded-xl capitalize font-medium">
                    {skill.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Stats Counter Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: t("pending"), value: pendingOrderCount, color: "text-warning", bg: "from-warning/10 to-transparent border-warning/10" },
            { icon: Clock, label: "Active", value: activeOrderCount, color: "text-info", bg: "from-info/10 to-transparent border-info/10" },
            { icon: MapIcon, label: t("total"), value: totalOrderCount, color: "text-primary", bg: "from-primary/10 to-transparent border-primary/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl bg-card border border-border p-4 text-center shadow-sm relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${stat.bg} pointer-events-none -z-10`} />
              <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
              <p className="font-display font-black text-foreground text-2xl tracking-tight">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Navigation Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button variant="hero" size="xl" className="w-full rounded-2xl shadow-sm hover:shadow-md transition active:scale-98" onClick={() => navigate("/mechanic-orders")}> 
            <Briefcase className="w-5 h-5 mr-1" /> {t("incomingJobs")}
          </Button>
          <Button variant="outline" size="xl" className="w-full rounded-2xl border-border bg-card shadow-sm hover:bg-secondary active:scale-98 transition" onClick={() => navigate("/mechanic-map")}> 
            <MapIcon className="w-5 h-5 mr-1 text-primary" /> Live Map
          </Button>
        </motion.div>

        {profile?.approval_status !== "approved" && (
          <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 text-xs text-muted-foreground leading-relaxed">
            {profile?.approval_status === "pending"
              ? "Your mechanic registration is currently pending review by our administrator. Once approved, you can toggle your status to online and begin accepting local roadside requests."
              : "Your registration was rejected. Please review your profile data, specialties, and documents, update them and submit for approval again."}
          </div>
        )}

        {/* Incoming Jobs Feed */}
        {profile?.approval_status === "approved" && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Assigned & Nearby Jobs
            </h2>
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground animate-pulse">
                  Refreshing job board…
                </div>
              ) : incomingOrders.length === 0 ? (
                <div className="rounded-2xl bg-card border border-border/80 p-8 text-center text-sm text-muted-foreground">
                  No active or pending requests found. Check back soon!
                </div>
              ) : (
                incomingOrders.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-foreground capitalize truncate text-sm">
                            {o.category ? o.category.replace(/-/g, " ") : " roadside assist"}
                          </h3>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            o.status === "pending" ? "bg-warning/10 text-warning border border-warning/20" : "bg-primary/10 text-primary border border-primary/20"
                          }`}>
                            {o.status === "pending" ? "Pending Accept" : o.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="w-3 h-3 text-primary shrink-0" /> 
                          {o.distance_km !== null && o.distance_km !== undefined
                            ? `${o.distance_km} km away`
                            : fmtLocation(o.location || o.garage_location || `${o.client_lat ?? ""},${o.client_lng ?? ""}`)}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{fmtTime(o.created_at)}</span>
                    </div>

                    {o.description && (
                      <p className="text-xs text-muted-foreground bg-secondary/40 p-2.5 rounded-xl border border-border/20 mb-3 italic">
                        "{o.description}"
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/40 text-xs">
                      {o.car_model ? (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" /> Vehicle: <span className="font-semibold text-foreground">{o.car_model} {o.car_year ? `(${o.car_year})` : ""}</span>
                        </p>
                      ) : (
                        <div />
                      )}
                      
                      {o.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="hero" 
                            size="sm" 
                            className="h-8 px-4 rounded-xl text-xs font-semibold shrink-0" 
                            onClick={() => acceptOrder(o.id)} 
                            disabled={hasActiveOrder || orderBusyId === o.id}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> {orderBusyId === o.id ? "Accepting..." : t("accept")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {(() => {
                            const step = nextSteps[o.status as keyof typeof nextSteps];
                            if (step) {
                              const Icon = step.icon;
                              return (
                                <Button 
                                  variant="hero" 
                                  size="sm" 
                                  className="h-8 px-4 rounded-xl text-xs font-semibold shrink-0" 
                                  onClick={() => advanceOrder(o.id, step.status)} 
                                  disabled={orderBusyId === o.id}
                                >
                                  <Icon className="w-3.5 h-3.5 mr-1" /> {orderBusyId === o.id ? "Updating..." : step.label}
                                </Button>
                              );
                            }
                            return null;
                          })()}
                          {/* Call & Chat buttons for accepted/active orders */}
                          {o.client_id && user && (
                            <>
                              {o.client_phone && (
                                <a 
                                  href={`tel:${o.client_phone}`}
                                  className="h-8 w-8 rounded-xl border border-border flex items-center justify-center shrink-0 hover:bg-secondary hover:border-primary/30 transition active:scale-95"
                                  title="📞 Call client"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-primary" />
                                </a>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 rounded-xl p-0 shrink-0 border-border hover:border-primary/30" 
                                onClick={() => navigate(`/chat?request=${o.id}&receiverId=${o.client_id}`)}
                                title="💬 Chat with client"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MechanicDashboardPage;
