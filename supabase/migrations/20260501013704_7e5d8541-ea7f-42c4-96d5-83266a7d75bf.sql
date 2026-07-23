-- Add fields needed for mechanic onboarding form
ALTER TABLE public.mechanic_profiles
  ADD COLUMN IF NOT EXISTS nida_number text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text;

-- Make user_id unique so we can upsert one profile per mechanic user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mechanic_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.mechanic_profiles
      ADD CONSTRAINT mechanic_profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- Allow user_roles inserts for the user themselves so picking the Mechanic role
-- can upgrade their role from 'client' to 'mechanic'
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role IN ('client'::app_role, 'mechanic'::app_role));

DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
CREATE POLICY "Users can update own role"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role IN ('client'::app_role, 'mechanic'::app_role));

-- Storage bucket for mechanic profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mechanic-profiles', 'mechanic-profiles', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Mechanic profile images are publicly readable" ON storage.objects;
CREATE POLICY "Mechanic profile images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mechanic-profiles');

DROP POLICY IF EXISTS "Users can upload own mechanic profile image" ON storage.objects;
CREATE POLICY "Users can upload own mechanic profile image"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mechanic-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own mechanic profile image" ON storage.objects;
CREATE POLICY "Users can update own mechanic profile image"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'mechanic-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime on mechanic_locations (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mechanic_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_locations;
  END IF;
END$$;

ALTER TABLE public.mechanic_locations REPLICA IDENTITY FULL;