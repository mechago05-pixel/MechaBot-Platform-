-- Ensure the mechanic onboarding RPC exists with the parameter names used by
-- the client, then make PostgREST immediately refresh its schema cache.
CREATE OR REPLACE FUNCTION public.submit_mechanic_registration(
  _full_name text,
  _nida_number text,
  _email text,
  _phone text,
  _experience_years integer,
  _specialties text[],
  _garage_location text,
  _lat double precision,
  _lng double precision,
  _profile_image_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to register as a mechanic';
  END IF;

  IF char_length(trim(_full_name)) < 2 OR char_length(trim(_nida_number)) < 4
     OR char_length(trim(_phone)) < 7 OR coalesce(array_length(_specialties, 1), 0) = 0
     OR char_length(trim(_garage_location)) < 2 OR _experience_years NOT BETWEEN 0 AND 80 THEN
    RAISE EXCEPTION 'Please provide valid mechanic registration details';
  END IF;

  INSERT INTO public.mechanic_profiles (
    user_id, full_name, nida_number, email, phone, experience_years,
    specialties, garage_location, lat, lng, profile_image_url, approval_status
  ) VALUES (
    _user_id, trim(_full_name), trim(_nida_number), lower(trim(_email)), trim(_phone), _experience_years,
    _specialties, trim(_garage_location), _lat, _lng, _profile_image_url, 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nida_number = EXCLUDED.nida_number,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    experience_years = EXCLUDED.experience_years,
    specialties = EXCLUDED.specialties,
    garage_location = EXCLUDED.garage_location,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    profile_image_url = COALESCE(EXCLUDED.profile_image_url, mechanic_profiles.profile_image_url),
    approval_status = CASE WHEN mechanic_profiles.approval_status = 'rejected' THEN 'pending' ELSE mechanic_profiles.approval_status END,
    updated_at = now();

  UPDATE public.user_roles
  SET role = 'mechanic'
  WHERE user_id = _user_id AND role = 'client';

  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'mechanic')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_mechanic_registration(text, text, text, text, integer, text[], text, double precision, double precision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mechanic_registration(text, text, text, text, integer, text[], text, double precision, double precision, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
