
-- FIX 1: Restrict profiles SELECT to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- FIX 2a: Remove user_roles INSERT policy (trigger handles it)
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;

-- FIX 2b: Harden handle_new_user trigger to always assign 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  -- Always assign 'client' role, ignore metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FIX 3: Add constraints and validation for service_requests
ALTER TABLE public.service_requests
  ADD CONSTRAINT valid_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT valid_car_model_length CHECK (car_model IS NULL OR char_length(car_model) <= 100),
  ADD CONSTRAINT valid_car_year_length CHECK (car_year IS NULL OR char_length(car_year) <= 10),
  ADD CONSTRAINT valid_price_range CHECK (
    (estimated_price_min IS NULL AND estimated_price_max IS NULL) OR
    (estimated_price_min >= 0 AND estimated_price_max >= estimated_price_min)
  ),
  ADD CONSTRAINT valid_vehicle_size CHECK (vehicle_size IN ('small', 'medium', 'large', 'suv', 'truck')),
  ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'matching', 'accepted', 'in_progress', 'completed', 'cancelled'));

-- Validation trigger for sanitization
CREATE OR REPLACE FUNCTION public.validate_service_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitize text inputs
  IF NEW.description IS NOT NULL THEN
    NEW.description = regexp_replace(NEW.description, '<[^>]*>', '', 'g');
  END IF;
  IF NEW.car_model IS NOT NULL THEN
    NEW.car_model = regexp_replace(NEW.car_model, '<[^>]*>', '', 'g');
  END IF;

  -- Validate category
  IF NEW.category NOT IN ('engine', 'battery', 'flat-tire', 'not-starting',
                          'brakes', 'oil-change', 'overheating',
                          'strange-noise', 'lights', 'other') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;

  -- Cap prices
  IF NEW.estimated_price_min IS NOT NULL AND NEW.estimated_price_min > 10000000 THEN
    RAISE EXCEPTION 'Price exceeds maximum limit';
  END IF;
  IF NEW.estimated_price_max IS NOT NULL AND NEW.estimated_price_max > 10000000 THEN
    RAISE EXCEPTION 'Price exceeds maximum limit';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_service_request_trigger
  BEFORE INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_request();
