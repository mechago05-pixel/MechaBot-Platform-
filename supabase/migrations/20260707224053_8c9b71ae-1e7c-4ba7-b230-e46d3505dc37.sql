
-- 1) mechanic_profiles: row + column protection
DROP POLICY IF EXISTS "Anyone authenticated can view approved mechanics" ON public.mechanic_profiles;
CREATE POLICY "View approved or own or admin"
ON public.mechanic_profiles FOR SELECT TO authenticated
USING (
  (approval_status = 'approved' AND is_blocked = false)
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

REVOKE SELECT ON public.mechanic_profiles FROM authenticated;
GRANT SELECT
  (id, user_id, specialties, garage_location, certification_urls, approval_status,
   is_online, rating, total_reviews, experience_years, tier, lat, lng,
   created_at, updated_at, profile_image_url, full_name, badge,
   availability_status, is_blocked)
ON public.mechanic_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_own_mechanic_profile()
RETURNS SETOF public.mechanic_profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.mechanic_profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_own_mechanic_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_mechanic_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_mechanic_profiles()
RETURNS SETOF public.mechanic_profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.mechanic_profiles ORDER BY created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() TO authenticated;

-- 2) mechanic_locations: restrict to relevant parties
DROP POLICY IF EXISTS "Anyone can view mechanic locations" ON public.mechanic_locations;
CREATE POLICY "View own or engaged mechanic locations"
ON public.mechanic_locations FOR SELECT TO authenticated
USING (
  mechanic_id IN (SELECT id FROM public.mechanic_profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.mechanic_profiles mp
    JOIN public.service_requests sr ON sr.mechanic_id = mp.user_id
    WHERE mp.id = mechanic_locations.mechanic_id
      AND sr.client_id = auth.uid()
      AND sr.status IN ('pending','in_progress','on_the_way','arrived','diagnosing','repairing')
  )
  OR EXISTS (
    SELECT 1 FROM public.mechanic_profiles mp
    JOIN public.orders o ON o.mechanic_id::uuid = mp.user_id
    WHERE mp.id = mechanic_locations.mechanic_id
      AND o.user_id::uuid = auth.uid()
      AND o.status IN ('pending','accepted')
  )
);

-- 3) has_role: SECURITY INVOKER + scoped execute
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 4) Lock down other SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_resets() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) TO authenticated;

-- 5) Storage policies (buckets themselves are created via the storage tool)
DROP POLICY IF EXISTS "avatars_owner_select" ON storage.objects;
CREATE POLICY "avatars_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "certs_owner_select" ON storage.objects;
CREATE POLICY "certs_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certifications'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'))
);
DROP POLICY IF EXISTS "certs_owner_insert" ON storage.objects;
CREATE POLICY "certs_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'mechanic')
);
DROP POLICY IF EXISTS "certs_owner_update" ON storage.objects;
CREATE POLICY "certs_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "certs_owner_delete" ON storage.objects;
CREATE POLICY "certs_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "mechprof_auth_select" ON storage.objects;
CREATE POLICY "mechprof_auth_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mechanic-profiles');
DROP POLICY IF EXISTS "mechprof_owner_insert" ON storage.objects;
CREATE POLICY "mechprof_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mechanic-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "mechprof_owner_update" ON storage.objects;
CREATE POLICY "mechprof_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mechanic-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "mechprof_owner_delete" ON storage.objects;
CREATE POLICY "mechprof_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mechanic-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);
