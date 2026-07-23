
-- 1) Trigger-based update restrictions for orders and service_requests
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := public.has_role(_uid, 'admin');
BEGIN
  IF _is_admin THEN
    RETURN NEW;
  END IF;

  -- immutable owner
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change order owner';
  END IF;

  IF _uid = OLD.user_id THEN
    -- Client: cannot self-assign mechanic or advance status beyond cancelling
    IF NEW.mechanic_id IS DISTINCT FROM OLD.mechanic_id THEN
      RAISE EXCEPTION 'Clients cannot change mechanic assignment';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('cancelled') THEN
      RAISE EXCEPTION 'Clients can only cancel orders';
    END IF;
  ELSIF _uid = OLD.mechanic_id OR (OLD.mechanic_id IS NULL AND _uid = NEW.mechanic_id) THEN
    -- Mechanic: cannot reassign to another mechanic
    IF NEW.mechanic_id IS DISTINCT FROM _uid THEN
      RAISE EXCEPTION 'Mechanics cannot reassign orders';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_orders_update ON public.orders;
CREATE TRIGGER enforce_orders_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_rules();

CREATE OR REPLACE FUNCTION public.enforce_service_request_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := public.has_role(_uid, 'admin');
BEGIN
  IF _is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Cannot change request owner';
  END IF;

  IF _uid = OLD.client_id THEN
    IF NEW.mechanic_id IS DISTINCT FROM OLD.mechanic_id THEN
      RAISE EXCEPTION 'Clients cannot change mechanic assignment';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('cancelled') THEN
      RAISE EXCEPTION 'Clients can only cancel requests';
    END IF;
  ELSIF _uid = OLD.mechanic_id OR (OLD.mechanic_id IS NULL AND _uid = NEW.mechanic_id) THEN
    IF NEW.mechanic_id IS DISTINCT FROM _uid THEN
      RAISE EXCEPTION 'Mechanics cannot reassign requests';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized to update this request';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_service_requests_update ON public.service_requests;
CREATE TRIGGER enforce_service_requests_update
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_request_update_rules();

REVOKE EXECUTE ON FUNCTION public.enforce_order_update_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_service_request_update_rules() FROM PUBLIC, anon, authenticated;

-- 2) Storage: remove public read on mechanic-profiles bucket
DROP POLICY IF EXISTS "Mechanic profile images are publicly readable" ON storage.objects;

-- 3) Force accept_service_request to only be callable for the acting mechanic
CREATE OR REPLACE FUNCTION public.accept_service_request(_request_id uuid, _mechanic_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _mechanic_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.has_role(auth.uid(), 'mechanic') THEN
    RAISE EXCEPTION 'Only mechanics can accept requests';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE mechanic_id = _mechanic_user_id
      AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'You already have an active job. Complete it first.';
  END IF;

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
$function$;

-- Restrict definer functions to only needed roles (revoke from anon)
REVOKE EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_own_mechanic_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_mechanic_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() TO authenticated;
