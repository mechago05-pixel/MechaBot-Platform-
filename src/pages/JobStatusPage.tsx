import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock, Truck, CheckCircle2, Phone, MessageSquare, Car, ShieldCheck, MapPin, Wrench, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LiveTrackingMap from "@/components/LiveTrackingMap";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type Request = {
  id: string;
  status: string;
  category: string;
  mechanic_id: string | null;
  created_at: string;
  mechanic_name?: string | null;
  mechanic_phone?: string | null;
  car_model?: string | null;
  car_year?: string | null;
  description?: string | null;
};

const steps = [
  { id: "pending", label: "Request sent", icon: Clock },
  { id: "accepted", label: "Mechanic accepted", icon: Check },
  { id: "on_the_way", label: "On the way", icon: Truck },
  { id: "arrived", label: "Mechanic arrived", icon: MapPin },
  { id: "diagnosis", label: "Diagnosing", icon: Search },
  { id: "repair", label: "Repairing", icon: Wrench },
  { id: "completed", label: "Order complete", icon: CheckCircle2 },
];

const JobStatusPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestId = params.get("requestId");
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!requestId) {
      navigate("/home", { replace: true });
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const data = await api.get<Request>(`/requests/${requestId}`);
        if (active) setRequest(data);
      } catch {
        if (active) setRequest(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [requestId, navigate]);

  const handleCancelRequest = async () => {
    if (!requestId || !request || request.status !== "pending") return;
    if (!window.confirm("Cancel this service request?")) return;
    setCancelling(true);
    try {
      await api.post(`/requests/${requestId}/cancel`);
      toast({ title: "Request cancelled" });
      navigate("/home", { replace: true });
    } catch (error) {
      toast({ title: "Unable to cancel request", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      setCancelling(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex justify-center items-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!request) return <div className="min-h-screen bg-background flex justify-center items-center px-6 text-muted-foreground">Order not found.</div>;

  const currentStatus = request.status;
  const current = steps.findIndex((step) => step.id === currentStatus);
  const showTracking = request.mechanic_id && currentStatus !== "pending" && currentStatus !== "completed";

  return (
    <main className="min-h-screen bg-background/95 pb-12 relative overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none -z-10" />

      <header className="flex items-center gap-3 p-5 max-w-md mx-auto">
        <button onClick={() => navigate("/home")} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Order Status</h1>
          <p className="text-xs text-muted-foreground capitalize">{request.category.replace(/-/g, " ")}</p>
        </div>
      </header>

      <section className="px-5 max-w-md mx-auto space-y-5">
        {/* Status card */}
        <div className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Live update</p>
              <h2 className="text-lg font-bold text-foreground capitalize mt-0.5">
                {currentStatus === "on_the_way" ? "On the way" : currentStatus === "arrived" ? "Mechanic arrived" : currentStatus === "diagnosis" ? "Diagnosing vehicle" : currentStatus === "repair" ? "Repairing vehicle" : currentStatus === "pending" ? "Request sent" : currentStatus === "accepted" ? "Mechanic accepted" : "Order complete"}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {currentStatus === "pending" && <Clock className="w-5 h-5 animate-pulse" />}
              {currentStatus === "accepted" && <Check className="w-5 h-5" />}
              {currentStatus === "on_the_way" && <Truck className="w-5 h-5 animate-bounce" />}
              {currentStatus === "arrived" && <MapPin className="w-5 h-5" />}
              {currentStatus === "diagnosis" && <Search className="w-5 h-5" />}
              {currentStatus === "repair" && <Wrench className="w-5 h-5" />}
              {currentStatus === "completed" && <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Map card */}
        {showTracking && (
          <div className="rounded-3xl bg-card border border-border p-4 shadow-sm space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground">Track Mechanic</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentStatus === "accepted"
                  ? "Your mechanic has accepted the request. They will start the trip soon."
                  : "Track the mechanic's live location and distance to your vehicle."}
              </p>
            </div>
            <LiveTrackingMap mechanicId={request.mechanic_id!} className="h-[280px] rounded-2xl overflow-hidden border border-border/40" />
          </div>
        )}

        {/* Mechanic Card */}
        {request.mechanic_id && (
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 border border-primary/20">
                {request.mechanic_name ? request.mechanic_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "M"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground truncate">{request.mechanic_name || "Assigned Mechanic"}</h3>
                  <span className="flex items-center gap-0.5 bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{request.mechanic_phone || "No phone listed"}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
              {request.mechanic_phone && (
                <a 
                  href={`tel:${request.mechanic_phone}`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold transition active:scale-98"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-10 rounded-xl gap-2 text-xs active:scale-98"
                onClick={() => navigate(`/chat?request=${request.id}&receiverId=${request.mechanic_id}`)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" /> Chat
              </Button>
            </div>
          </div>
        )}

        {/* Stepper Card */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm mb-4">Service Progress</h3>
          <div className="relative pl-8 space-y-6">
            {/* connecting line */}
            <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-muted">
              <div 
                className="absolute top-0 left-0 w-full bg-primary transition-all duration-500 ease-out" 
                style={{ height: `${(current / (steps.length - 1)) * 100}%` }}
              />
            </div>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < current;
              const isActive = index === current;
              
              return (
                <div key={step.id} className="relative flex flex-col justify-center min-h-[36px]">
                  {/* indicator */}
                  <div className={`absolute -left-[28px] w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                    isCompleted 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : isActive 
                      ? "bg-background border-primary text-primary" 
                      : "bg-background border-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary animate-ping" : "bg-transparent"}`} />
                    )}
                  </div>
                  
                  {/* content */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm transition-colors duration-300 ${
                        isActive 
                          ? "text-primary" 
                          : isCompleted 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground font-normal"
                      }`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {step.id === "pending" && "Waiting for a mechanic to accept your request..."}
                        {step.id === "accepted" && "Your mechanic accepted the request and is getting ready."}
                        {step.id === "on_the_way" && "Track the mechanic's live route to your location."}
                        {step.id === "arrived" && "The mechanic has arrived at your location."}
                        {step.id === "diagnosis" && "The mechanic is diagnosing the issue with your vehicle."}
                        {step.id === "repair" && "The mechanic is repairing your vehicle."}
                        {step.id === "completed" && "Your service request is complete! Thank you for using MechaBot."}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Details Card */}
        {(request.car_model || request.description) && (
          <div className="rounded-2xl bg-card border border-border p-5 text-xs text-muted-foreground space-y-3 shadow-sm">
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5 mb-1">
              <Car className="w-4 h-4 text-primary" /> Service Details
            </p>
            {request.car_model && (
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Vehicle:</span>
                <span className="font-medium text-foreground">{request.car_model} {request.car_year ? `(${request.car_year})` : ""}</span>
              </div>
            )}
            {request.description && (
              <div className="pt-1">
                <span className="block text-muted-foreground mb-1">Issue description:</span>
                <p className="text-foreground bg-secondary/50 p-3 rounded-xl border border-border/20 italic font-normal leading-relaxed">
                  "{request.description}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cancel button */}
        {request.status === "pending" && (
          <div className="pt-2">
            <Button variant="outline" className="w-full h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 transition duration-200" onClick={handleCancelRequest} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Cancel request"}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
};

export default JobStatusPage;