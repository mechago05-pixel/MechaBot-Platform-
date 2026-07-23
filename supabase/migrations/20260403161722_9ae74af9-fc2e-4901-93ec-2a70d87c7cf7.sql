
CREATE OR REPLACE FUNCTION public.accept_service_request(_request_id uuid, _mechanic_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if mechanic already has an active (in_progress) order
  IF EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE mechanic_id = _mechanic_user_id
      AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'You already have an active job. Complete it first.';
  END IF;

  -- Accept the order (only if still pending)
  UPDATE public.service_requests
  SET status = 'in_progress',
      mechanic_id = _mechanic_user_id,
      updated_at = now()
  WHERE id = _request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This order is no longer available.';
  END IF;
END;
$$;
