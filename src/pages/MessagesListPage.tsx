import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

interface ConversationPreview {
  requestId: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

const MessagesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const timer = window.setInterval(fetchConversations, 10000);
    return () => window.clearInterval(timer);
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const msgs = await api.get<Array<{ id: string; request_id: string; sender_id: string; receiver_id: string; message: string; status: string; created_at: string; sender_name: string; receiver_name: string }>>("/conversations").catch(() => []);

    if (!msgs || msgs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by request_id
    const groupedMap = new Map<string, typeof msgs>();
    for (const msg of msgs) {
      const key = msg.request_id;
      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(msg);
    }

    const convos: ConversationPreview[] = [];
    for (const [requestId, messages] of groupedMap) {
      const latest = messages[0];
      const otherId = latest.sender_id === user.id ? latest.receiver_id : latest.sender_id;
      const unread = messages.filter((m) => m.receiver_id === user.id && m.status === "unread").length;
      convos.push({
        requestId,
        otherUserId: otherId,
        otherUserName: latest.sender_id === user.id ? latest.receiver_name : latest.sender_name,
        lastMessage: latest.message,
        lastTime: latest.created_at,
        unreadCount: unread,
      });
    }

    setConversations(convos);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold font-display text-foreground">{t("chatMechanic")}</h1>
        </div>
      </header>

      <main className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Messages will appear after a mechanic is assigned</p>
          </motion.div>
        ) : (
          conversations.map((convo, i) => (
            <motion.div
              key={convo.requestId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/chat?request=${convo.requestId}&receiverId=${convo.otherUserId}`)}
              className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">
                  {convo.otherUserName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">{convo.otherUserName}</p>
                  <p className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(convo.lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.lastMessage}</p>
              </div>
              {convo.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-primary-foreground font-bold">{convo.unreadCount}</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MessagesListPage;
