
CREATE TABLE public.mechanic_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES public.mechanic_profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL DEFAULT -6.7924,
  longitude double precision NOT NULL DEFAULT 39.2083,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mechanic_id)
);

ALTER TABLE public.mechanic_locations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view mechanic locations
CREATE POLICY "Anyone can view mechanic locations"
ON public.mechanic_locations FOR SELECT
TO authenticated
USING (true);

-- Mechanics can upsert their own location
CREATE POLICY "Mechanics can update own location"
ON public.mechanic_locations FOR INSERT
TO authenticated
WITH CHECK (
  mechanic_id IN (SELECT id FROM public.mechanic_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Mechanics can modify own location"
ON public.mechanic_locations FOR UPDATE
TO authenticated
USING (
  mechanic_id IN (SELECT id FROM public.mechanic_profiles WHERE user_id = auth.uid())
);

-- Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_locations;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
