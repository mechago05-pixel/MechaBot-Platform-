-- 1. Create new orders table for the Repair Estimates flow
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mechanic_id UUID NOT NULL,
  description TEXT,
  problem TEXT,
  car_category TEXT,
  location JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Clients can create orders"
    ON public.orders FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Involved users can view orders"
    ON public.orders FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id OR auth.uid()::text = mechanic_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Involved users can update orders"
    ON public.orders FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id OR auth.uid()::text = mechanic_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage all orders"
    ON public.orders FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX idx_orders_mechanic_status ON public.orders(mechanic_id, status);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX idx_orders_user ON public.orders(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend service_prices with estimate-range fields (keep existing columns intact)
ALTER TABLE public.service_prices
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS possible_cause TEXT,
  ADD COLUMN IF NOT EXISTS min_price INTEGER,
  ADD COLUMN IF NOT EXISTS max_price INTEGER;

CREATE INDEX IF NOT EXISTS idx_service_prices_problem_size
  ON public.service_prices(problem, car_size);

-- 3. Extend mechanic_profiles with diagnosis_fee and badge
ALTER TABLE public.mechanic_profiles
  ADD COLUMN IF NOT EXISTS diagnosis_fee INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge TEXT;