import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Wrench, ClipboardList, BarChart3, CheckCircle, XCircle, Shield, Bell, LogOut, Phone, Mail, MapPin, Award, PhoneCall, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface MechanicProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  specialties: string[];
  garage_location: string | null;
  approval_status: string;
  tier: string | null;
  rating: number | null;
  is_online: boolean;
  experience_years: number | null;
  nida_number: string | null;
  profile_image_url: string | null;
  created_at: string;
  // Joined from users table
  user_full_name: string;
  user_phone: string | null;
  email: string;
}

interface ServiceRequest {
  id: string;
  client_id: string;
  mechanic_id: string | null;
  category: string;
  status: string;
  created_at: string;
  car_model: string | null;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (role !== "admin") {
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, [role]);

  const fetchData = async () => {
    try {
      const [mechanics, requests] = await Promise.all([
        api.get<MechanicProfile[]>("/admin/mechanics"),
        api.get<ServiceRequest[]>("/requests"),
      ]);
      setMechanics(mechanics);
      setRequests(requests);
    } catch (error) {
      toast({ title: "Unable to load admin data", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMechanic = async (id: string) => {
    try {
      await api.post(`/admin/mechanics/${id}/approval`, { approval_status: "approved" });
      toast({ title: "✅ Mechanic Approved" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    }
  };

  const handleRejectMechanic = async (id: string) => {
    try {
      await api.post(`/admin/mechanics/${id}/approval`, { approval_status: "rejected" });
      toast({ title: "Mechanic Rejected" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const pendingMechanics = mechanics.filter((m) => m.approval_status === "pending");
  const approvedMechanics = mechanics.filter((m) => m.approval_status === "approved");
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const completedRequests = requests.filter((r) => r.status === "completed").length;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
    in_progress: "bg-info/20 text-info",
    completed: "bg-primary/20 text-primary",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-display text-xl font-bold text-foreground">Admin Panel</h1>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground"
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="px-5 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Mechanics", value: mechanics.length, icon: Wrench, color: "text-primary" },
            { label: "Requests", value: totalRequests, icon: ClipboardList, color: "text-info" },
            { label: "Pending", value: pendingMechanics.length, icon: Bell, color: "text-warning" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-card border border-border p-3 text-center"
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="mechanics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="mechanics" className="text-xs">Mechanics</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          </TabsList>

          {/* Mechanics Tab */}
          <TabsContent value="mechanics" className="space-y-3">
            {pendingMechanics.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-warning uppercase tracking-wider">Pending Approval</h3>
                {pendingMechanics.map((mech) => {
                  const isExpanded = expandedId === mech.id;
                  const name = mech.user_full_name || mech.full_name || "Mechanic";
                  const phone = mech.user_phone || mech.phone;
                  return (
                    <motion.div
                      key={mech.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl bg-card border border-warning/30 overflow-hidden"
                    >
                      {/* Clickable header to expand/collapse */}
                      <div 
                        className="p-4 space-y-3 cursor-pointer hover:bg-secondary/30 transition"
                        onClick={() => toggleExpand(mech.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                {name}
                                {mech.experience_years && (
                                  <span className="text-[10px] text-muted-foreground font-normal">({mech.experience_years}yrs)</span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {mech.garage_location || "No location"}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${statusColor[mech.approval_status]}`}>
                            {mech.approval_status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {mech.specialties.map((s) => (
                            <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{s.replace("-", " ")}</span>
                          ))}
                        </div>

                        {/* Preview contact info */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {phone}</span>}
                          {mech.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {mech.email}</span>}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="px-4 pb-4 border-t border-border/40 pt-3 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-secondary/40 rounded-xl p-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">NIDA Number</p>
                              <p className="font-medium text-foreground">{mech.nida_number || "—"}</p>
                            </div>
                            <div className="bg-secondary/40 rounded-xl p-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rating</p>
                              <p className="font-medium text-foreground">{mech.rating ? `⭐ ${mech.rating}` : "—"}</p>
                            </div>
                            <div className="bg-secondary/40 rounded-xl p-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</p>
                              <p className="font-medium text-foreground capitalize">{mech.tier || "silver"}</p>
                            </div>
                            <div className="bg-secondary/40 rounded-xl p-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</p>
                              <p className={`font-medium ${mech.is_online ? "text-primary" : "text-muted-foreground"}`}>{mech.is_online ? "Yes" : "No"}</p>
                            </div>
                          </div>

                          {/* Call & contact actions */}
                          <div className="flex gap-2 pt-1">
                            {phone && (
                              <a 
                                href={`tel:${phone}`}
                                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition active:scale-98"
                              >
                                <PhoneCall className="w-3.5 h-3.5" /> Call
                              </a>
                            )}
                            <Button 
                              size="sm" 
                              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
                              onClick={() => handleApproveMechanic(mech.id)}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs h-9"
                              onClick={() => handleRejectMechanic(mech.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Quick actions always visible */}
                      {!isExpanded && (
                        <div className="px-4 pb-4 flex gap-2 border-t border-border/40 pt-3">
                          {phone && (
                            <a 
                              href={`tel:${phone}`}
                              className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-semibold transition active:scale-98"
                            >
                              <PhoneCall className="w-3 h-3" /> Call
                            </a>
                          )}
                          <Button 
                            size="sm" 
                            className="flex-1 h-8 text-[10px] bg-primary hover:bg-primary/90"
                            onClick={() => handleApproveMechanic(mech.id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 h-8 text-[10px]"
                            onClick={() => handleRejectMechanic(mech.id)}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </>
            )}

            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">
              Approved Mechanics ({approvedMechanics.length})
            </h3>
            {approvedMechanics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No approved mechanics yet</p>
            ) : (
              approvedMechanics.map((mech) => {
                const name = mech.user_full_name || mech.full_name || "Mechanic";
                const phone = mech.user_phone || mech.phone;
                return (
                  <div key={mech.id} className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                          {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${mech.is_online ? "bg-primary" : "bg-muted-foreground"}`} />
                            <p className="text-sm font-semibold text-foreground">{name}</p>
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{mech.tier?.toUpperCase() || "SILVER"}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {phone && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {phone}
                              </span>
                            )}
                            {mech.garage_location && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {mech.garage_location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {phone && (
                          <a 
                            href={`tel:${phone}`}
                            className="h-8 w-8 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition active:scale-95"
                            title="Call mechanic"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-primary" />
                          </a>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-foreground font-medium">⭐ {mech.rating || 0}</p>
                          <p className="text-[10px] text-muted-foreground">{mech.experience_years ? `${mech.experience_years}yrs` : "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {mech.specialties.slice(0, 5).map((s) => (
                        <span key={s} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full capitalize">{s.replace("-", " ")}</span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No requests yet</p>
            ) : (
              requests.slice(0, 20).map((req) => (
                <div key={req.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground capitalize">{req.category.replace("-", " ")}</p>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${statusColor[req.status] || "bg-muted text-muted-foreground"}`}>
                      {req.status}
                    </span>
                  </div>
                  {req.car_model && <p className="text-xs text-muted-foreground">🚗 {req.car_model}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Requests", value: totalRequests, color: "text-info" },
                { label: "Pending", value: pendingRequests, color: "text-warning" },
                { label: "Completed", value: completedRequests, color: "text-primary" },
                { label: "Mechanics Online", value: mechanics.filter((m) => m.is_online).length, color: "text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-card border border-border p-4 text-center">
                  <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-card border border-border p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Request Status Breakdown</h4>
              {["pending", "in_progress", "completed"].map((status) => {
                const count = requests.filter((r) => r.status === status).length;
                const pct = totalRequests > 0 ? (count / totalRequests) * 100 : 0;
                return (
                  <div key={status} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground capitalize">{status.replace("_", " ")}</span>
                      <span className="text-foreground font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full rounded-full ${
                          status === "pending" ? "bg-warning" : status === "completed" ? "bg-primary" : "bg-info"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;