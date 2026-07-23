-- Keep admin approval behind a controlled function. This avoids exposing direct
-- UPDATE access to mechanic_profiles while still allowing legitimate approvals.
CREATE OR REPLACE FUNCTION public.admin_set_mechanic_approval(
  _profile_id uuid,
  _approval_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _approval_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  UPDATE public.mechanic_profiles
  SET approval_status = _approval_status, updated_at = now()
  WHERE id = _profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mechanic profile not found';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_mechanic_approval(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_mechanic_approval(uuid, text) TO authenticated;

-- A request can only move forwards through its real service lifecycle.
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.service_requests
  ADD CONSTRAINT valid_status CHECK (status IN (
    'pending', 'matching', 'accepted', 'on_the_way', 'arrived',
    'diagnosis', 'repair', 'completed', 'cancelled', 'inspection_only'
  ));

CREATE OR REPLACE FUNCTION public.accept_service_request(_request_id uuid, _mechanic_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _mechanic_user_id
     OR NOT public.has_role(auth.uid(), 'mechanic') THEN
    RAISE EXCEPTION 'Only the signed-in mechanic can accept this request';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE mechanic_id = _mechanic_user_id
      AND status IN ('accepted', 'on_the_way', 'arrived', 'diagnosis', 'repair')
  ) THEN
    RAISE EXCEPTION 'You already have an active job. Complete it first.';
  END IF;

  UPDATE public.service_requests
  SET status = 'accepted', mechanic_id = _mechanic_user_id, updated_at = now()
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This order is no longer available.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_service_request_status(
  _request_id uuid,
  _next_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
BEGIN
  SELECT status INTO _current_status
  FROM public.service_requests
  WHERE id = _request_id AND mechanic_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND OR NOT public.has_role(auth.uid(), 'mechanic') THEN
    RAISE EXCEPTION 'Not authorized to update this request';
  END IF;

  IF NOT ((_current_status = 'accepted' AND _next_status = 'on_the_way')
       OR (_current_status = 'on_the_way' AND _next_status = 'arrived')
       OR (_current_status = 'arrived' AND _next_status = 'diagnosis')
       OR (_current_status = 'diagnosis' AND _next_status = 'repair')
       OR (_current_status = 'repair' AND _next_status = 'completed')) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', _current_status, _next_status;
  END IF;

  UPDATE public.service_requests
  SET status = _next_status, updated_at = now()
  WHERE id = _request_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.advance_service_request_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_service_request_status(uuid, text) TO authenticated;
