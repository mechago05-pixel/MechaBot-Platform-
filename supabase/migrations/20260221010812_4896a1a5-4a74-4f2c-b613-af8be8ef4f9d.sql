
-- Password resets table for custom OTP flow
CREATE TABLE public.password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  resend_count integer NOT NULL DEFAULT 0,
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- No client-side access - only edge functions with service role can access this table
-- No RLS policies needed since edge functions use service role key

-- Index for fast email lookups
CREATE INDEX idx_password_resets_email ON public.password_resets (email);

-- Auto-cleanup expired records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_resets()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_resets
  WHERE expires_at < now() - interval '1 hour';
$$;
