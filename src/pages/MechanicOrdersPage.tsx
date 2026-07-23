import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, CheckCheck, Truck, User, Calendar, Wrench, ShieldCheck, Sparkles, MapPin, MessageSquare, PhoneCall, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useOrderAlarm } from "@/hooks/use-order-alarm";

type ServiceRequest = {
  id: string;
  category: string;
  description: string | null;
  car_model: string | null;
  car_year: string | null;
  status: string;
  client_id: string;
  mechanic_id: string | null;
  created_at: string;
  distance_km?: number | null;
  client_lat?: number | null;
  client_lng?: number | null;
  client_phone?: string | null;
};

const activeStatuses = ["accepted", "on_the_way", "arrived", "diagnosis", "repair"];
const labels: Record<string, string> = { pending: "Pending", accepted: "Accepted", on_the_way: "On way", arrived: "Arrived", diagnosis: "Diagnosis", repair: "Repair", completed: "Completed" };
const colors: Record<string, string> = { pending: "bg-warning/10 text-warning border border-warning/20", accepted: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20", on_the_way: "bg-blue-500/10 text-blue-500 border border-blue-500/20", arrived: "bg-teal-500/10 text-teal-500 border border-teal-500/20", diagnosis: "bg-amber-500/10 text-amber-500 border border-amber-500/20", repair: "bg-orange-500/10 text-orange-500 border border-orange-500/20", completed: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" };
const nextSteps = {
  accepted: { status: "on_the_way", label: "Start trip", icon: Truck },
  on_the_way: { status: "arrived", label: "Arrived", icon: MapPin },
  arrived: { status: "diagnosis", label: "Start diagnosis", icon: Search },
  diagnosis: { status: "repair", label: "Start repair", icon: Wrench },
  repair: { status: "completed", label: "Complete order", icon: CheckCheck },
} as const;

const MechanicOrdersPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      setRequests(await api.get<ServiceRequest[]>("/requests"));
    } catch (error) {
      toast({ title: "Unable to load orders", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const timer = window.setInterval(fetchRequests, 10000);
    return () => window.clearInterval(timer);
  }, [user, role]);

  useOrderAlarm(requests, user?.id);

  const activeJob = requests.find((request) => request.mechanic_id === user?.id && activeStatuses.includes(request.status));
  const visibleRequests = requests.filter((request) => {
    if (!user) return false;
    if (request.status === "pending") {
      // Client-side safety: discard pending requests older than 30 seconds
      const createdAt = new Date(request.created_at).getTime();
      if (createdAt < Date.now() - 30_000) return false;
      return request.mechanic_id === null || request.mechanic_id === user.id;
    }
    return request.mechanic_id === user.id;
  });

  const accept = async (requestId: string) => {
    if (!user) return;
    setBusyId(requestId);
    try {
      await api.post(`/requests/${requestId}/accept`);
      toast({ title: "Order accepted", description: "Update the status as you travel and work." });
      await fetchRequests();
    } catch (error) {
      toast({ title: "Cannot accept order", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      await fetchRequests();
    } finally {
      setBusyId(null);
    }
  };

  const advance = async (requestId: string, nextStatus: string) => {
    setBusyId(requestId);
    try { 
      await api.post(`/requests/${requestId}/status`, { status: nextStatus }); 
      toast({ title: "Order status updated", description: labels[nextStatus] }); 
      fetchRequests(); 
    } catch (error) { 
      toast({ title: "Status not updated", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" }); 
    } finally { 
      setBusyId(null); 
    }
  };

  return (
    <main className="min-h-screen bg-background/95 pb-12 relative overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none -z-10" />

      <header className="flex items-center gap-3 p-5 max-w-2xl mx-auto">
        <button onClick={() => navigate("/mechanic/dashboard")} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Incoming Orders</h1>
          <p className="text-xs text-muted-foreground">Manage and update your active jobs in real-time.</p>
        </div>
      </header>

      <section className="px-5 max-w-2xl mx-auto space-y-4">
        {activeJob && (
          <Alert className="rounded-2xl border-warning/30 bg-warning/5 p-4 shadow-sm flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-warning shrink-0" />
            <div>
              <AlertTitle className="font-bold text-warning-foreground">Active order in progress: {labels[activeJob.status]}</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5">Please update or complete your current active order before accepting another roadside request.</AlertDescription>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse">Checking job board...</p>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl p-6">
            <User className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No service requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">Roadside assistance requests will appear here in real-time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => {
              const isMine = request.mechanic_id === user?.id;
              const step = nextSteps[request.status as keyof typeof nextSteps];
              return (
                <article key={request.id} className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="font-display font-bold text-foreground capitalize text-sm">{request.category.replace(/-/g, " ")}</h2>
                          {isMine && (
                            <span className="flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              <ShieldCheck className="w-3 h-3" /> Assigned
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> {new Date(request.created_at).toLocaleString()}
                        </p>
                        {request.distance_km !== null && request.distance_km !== undefined && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-primary" /> {request.distance_km} km away
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${colors[request.status] ?? "bg-muted text-muted-foreground"}`}>
                      {labels[request.status] ?? request.status}
                    </span>
                  </div>

                  {request.description && (
                    <div className="mt-4">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Problem Description:</span>
                      <p className="mt-1 text-xs text-muted-foreground bg-secondary/50 p-3 rounded-xl border border-border/20 italic leading-relaxed">
                        "{request.description}"
                      </p>
                    </div>
                  )}

                  {request.car_model && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground font-medium bg-secondary/30 px-3 py-2 rounded-xl border border-border/10 w-fit">
                      <Wrench className="w-3.5 h-3.5 text-primary" />
                      <span>Vehicle: <strong className="text-foreground font-semibold">{request.car_model} {request.car_year ? `(${request.car_year})` : ""}</strong></span>
                    </div>
                  )}

                  <div className="mt-5 flex gap-2 pt-4 border-t border-border/40">
                    {request.status === "pending" && role === "mechanic" && (
                      <Button 
                        variant={activeJob ? "outline" : "hero"}
                        size="sm" 
                        className="flex-1 rounded-xl h-10 text-xs font-semibold" 
                        disabled={busyId === request.id} 
                        onClick={() => {
                          if (activeJob) {
                            toast({ title: "Active job in progress", description: "Please complete your current active order first.", variant: "destructive" });
                            return;
                          }
                          accept(request.id);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {busyId === request.id ? "Accepting..." : activeJob ? "Active job in progress" : "Accept order"}
                      </Button>
                    )}
                    {isMine && step && role === "mechanic" && (
                      <Button 
                        variant="hero" 
                        size="sm" 
                        className="flex-1 rounded-xl h-10 text-xs font-semibold" 
                        disabled={busyId === request.id} 
                        onClick={() => advance(request.id, step.status)}
                      >
                        <step.icon className="w-4 h-4 mr-1" />
                        {busyId === request.id ? "Updating..." : step.label}
                      </Button>
                    )}
                    {/* Call & Chat buttons for accepted/active orders */}
                    {isMine && request.client_id && user && (
                      <>
                        {request.client_phone && (
                          <a 
                            href={`tel:${request.client_phone}`}
                            className="h-10 w-10 rounded-xl border border-border flex items-center justify-center shrink-0 hover:bg-secondary hover:border-primary/30 transition active:scale-95"
                            title="📞 Call client"
                          >
                            <PhoneCall className="w-4 h-4 text-primary" />
                          </a>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 w-10 rounded-xl p-0 shrink-0 border-border hover:border-primary/30" 
                          onClick={() => navigate(`/chat?request=${request.id}&receiverId=${request.client_id}`)}
                          title="💬 Chat with client"
                        >
                          <MessageSquare className="w-4 h-4 text-primary" />
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default MechanicOrdersPage;
