ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_price integer;
ALTER TABLE public.mechanic_profiles ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available';