import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request");
  const receiverId = searchParams.get("receiverId");
  const { user } = useAuth();
  const { t } = useI18n();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherName, setOtherName] = useState("Chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestId || !user) return;
    fetchMessages();
    fetchOtherName();

    const timer = window.setInterval(fetchMessages, 5000);
    return () => window.clearInterval(timer);
  }, [requestId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try { setMessages(await api.get<Message[]>(`/messages?request_id=${encodeURIComponent(requestId!)}`)); } catch { setMessages([]); }
  };

  const fetchOtherName = async () => {
    if (!receiverId) return;
    const request = await api.get<{ client_id: string; mechanic_id: string | null; client_name: string; mechanic_name: string | null }>(`/requests/${requestId}`);
    if (receiverId === request.client_id) setOtherName(request.client_name);
    else if (request.mechanic_id === receiverId) setOtherName(request.mechanic_name || "Mechanic");
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !requestId || !receiverId) return;
    const msg = input.trim().replace(/<[^>]*>/g, "").slice(0, 500);
    setInput("");

    try { await api.post("/messages", { request_id: requestId, receiver_id: receiverId, message: msg }); await fetchMessages(); } catch { setInput(msg); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">
            {otherName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground text-sm truncate">{otherName}</h3>
          <p className="text-xs text-primary">{t("online")}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("typeMessage")}
            className="flex-1 h-12 rounded-2xl bg-card border border-border px-4 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          <Button variant="hero" size="icon" className="h-12 w-12 rounded-2xl shrink-0" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
