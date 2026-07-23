import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const RatingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId") || "";
  const { t } = useI18n();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);

    try { await api.post(`/requests/${requestId}/rating`, { rating, comment }); }
    catch (error) { toast({ title: "Unable to submit rating", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" }); setSubmitting(false); return; }

    setSubmitting(false);
    toast({ title: "⭐ Asante!", description: "Rating yako imetumwa." });
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 p-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">Rate Mechanic</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Star className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-foreground">How was your experience?</h2>
            <p className="text-sm text-muted-foreground mt-1">Tafadhali mpe fundi rating yako</p>
          </div>

          {/* Stars */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hovered || rating)
                      ? "text-warning fill-warning"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-sm font-medium text-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent!"}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            className="w-full h-24 rounded-2xl bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={rating === 0 || submitting}
            onClick={handleSubmit}
          >
            <Send className="w-5 h-5" />
            {submitting ? "Sending..." : "Submit Rating"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default RatingPage;
