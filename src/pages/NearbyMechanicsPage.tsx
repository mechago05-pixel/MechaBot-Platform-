import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";

type Request = { id: string; status: string; mechanic_id: string | null; category: string; created_at: string };

const NearbyMechanicsPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestId = params.get("requestId");
  const { t } = useI18n();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  const secondsRemaining = useMemo(() => {
    if (!request || request.status !== "pending") return 0;
    const elapsed = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000);
    return Math.max(0, 30 - elapsed);
  }, [request]);

  const waitingExpired = useMemo(() => request?.status === "pending" && secondsRemaining <= 0, [request, secondsRemaining]);

  const handleCancelRequest = async () => {
    if (!requestId) return;
    if (!window.confirm("Cancel this service request?")) return;
    setLoading(true);
    try {
      await api.post(`/requests/${requestId}/cancel`);
      toast({ title: "Request cancelled" });
      navigate("/home", { replace: true });
    } catch (error) {
      toast({ title: "Unable to cancel request", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!requestId) { navigate("/home", { replace: true }); return; }
    let active = true;
    const load = async () => {
      try {
        const data = await api.get<Request>(`/requests/${requestId}`);
        if (active) setRequest(data);
      } catch {
        // Request was deleted (404 - no mechanic accepted in time / expired)
        if (active) setRequest(null);
      }
      finally { if (active) setLoading(false); }
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [requestId, navigate]);

  // Handle deleted requests (no mechanic accepted within 30s, backend deletes the record)
  useEffect(() => {
    if (!request && !loading && requestId) {
      toast({ title: "Request expired", description: "No mechanic accepted your request in time.", variant: "destructive" });
      navigate("/home", { replace: true });
    }
  }, [request, loading, requestId, navigate]);

  useEffect(() => {
    if (!request) return;
    if (request.status !== "pending") {
      navigate(`/job-status?requestId=${request.id}`, { replace: true });
      return;
    }
    if (waitingExpired) {
      toast({ title: "Request expired", description: "No mechanic accepted your request in time.", variant: "destructive" });
      navigate("/home", { replace: true });
      return;
    }

    const interval = window.setInterval(() => {
      if (request.status !== "pending") return;
      const elapsed = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000);
      if (elapsed >= 30) {
        toast({ title: "Request expired", description: "No mechanic accepted your request in time.", variant: "destructive" });
        navigate("/home", { replace: true });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [navigate, request, waitingExpired]);

  if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!request) return <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center text-muted-foreground">This service request is unavailable.</div>;
  const assigned = Boolean(request.mechanic_id);
  return <main className="min-h-screen bg-background flex flex-col">
    <header className="flex items-center gap-3 p-5"><button onClick={() => navigate("/home")} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button><h1 className="font-display text-xl font-bold">{assigned ? t("mechanicAssigned") : t("searchingMechanics")}</h1></header>
    <section className="flex-1 flex items-center justify-center px-6 text-center"><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">{assigned ? <CheckCircle2 className="w-10 h-10 text-primary" /> : <Wrench className="w-10 h-10 text-primary" />}</div>
      <h2 className="font-display text-2xl font-bold">{assigned ? t("mechanicAccepted") : t("waitingAcceptance")}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{assigned ? `Your mechanic has accepted the request. Current status: ${request.status.replace(/_/g, " ")}.` : t("requestSent")}</p>
      <div className="space-y-3">
        <Button variant="hero" size="lg" className="w-full" onClick={() => navigate(`/job-status?requestId=${request.id}`)}>
          {assigned ? t("trackMechanic") : "View request status"}
        </Button>
        {!assigned && request.status === "pending" && (
          <Button variant="outline" size="lg" className="w-full" onClick={handleCancelRequest} disabled={loading}>
            Cancel request
          </Button>
        )}
      </div>
      {!assigned && request.status === "pending" && (
        <div className="mt-6 rounded-2xl bg-card border border-warning/30 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">Waiting for a mechanic…</p>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-warning" style={{ width: `${(secondsRemaining / 30) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs">If no mechanic accepts within 30 seconds, this request will expire.</p>
          <p className="mt-1 text-xs font-semibold">Time left: {secondsRemaining}s</p>
        </div>
      )}
    </motion.div></section>
  </main>;
};

export default NearbyMechanicsPage;