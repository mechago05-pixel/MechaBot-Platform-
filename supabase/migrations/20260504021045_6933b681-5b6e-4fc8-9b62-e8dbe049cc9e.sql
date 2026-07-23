-- Add payment_method (cash MVP) to both order tables
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash';

-- Extend status notification function to handle inspection_only
CREATE OR REPLACE FUNCTION public.notify_on_request_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _message text;
  _target_user uuid;
  _type text := 'order';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'in_progress' THEN
      _message := 'Fundi amekubali oda yako! Anajiandaa kuja.';
      _target_user := NEW.client_id;
    WHEN 'on_the_way' THEN
      _message := 'Fundi anaelekea eneo lako.';
      _target_user := NEW.client_id;
    WHEN 'arrived' THEN
      _message := 'Fundi amefika kwenye site.';
      _target_user := NEW.client_id;
    WHEN 'diagnosing' THEN
      _message := 'Fundi ameanza kuchunguza tatizo.';
      _target_user := NEW.client_id;
    WHEN 'repairing' THEN
      _message := 'Fundi ameanza kazi ya kutengeneza.';
      _target_user := NEW.client_id;
    WHEN 'inspection_only' THEN
      _message := 'Fundi amekamilisha ukaguzi tu (hakuna ukarabati uliofanyika).';
      _target_user := NEW.client_id;
    WHEN 'completed' THEN
      _message := 'Fundi amemaliza kazi! Tafadhali mpe rating yako.';
      _target_user := NEW.client_id;
    WHEN 'cancelled' THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (NEW.client_id, 'warning', 'Oda yako imeghairiwa. Tunakutafutia fundi mwingine.');
      IF NEW.mechanic_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, message)
        VALUES (NEW.mechanic_id, 'warning', 'Oda imeghairiwa na mteja.');
      END IF;
      RETURN NEW;
    ELSE
      RETURN NEW;
  END CASE;

  IF _target_user IS NOT NULL AND _message IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (_target_user, _type, _message);
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger for service_requests status changes (if not present)
DROP TRIGGER IF EXISTS trg_notify_request_status ON public.service_requests;
CREATE TRIGGER trg_notify_request_status
AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_status_change();

-- Notify client when mechanic accepts/rejects an order from the new orders table
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _message text;
  _type text := 'order';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'accepted' THEN
      _message := 'Fundi amekubali ombi lako.';
    WHEN 'rejected' THEN
      _message := 'Fundi amekataa ombi lako. Tafadhali chagua fundi mwingine.';
      _type := 'warning';
    WHEN 'completed' THEN
      _message := 'Kazi imekamilika. Tafadhali toa rating.';
    WHEN 'inspection_only' THEN
      _message := 'Fundi amefanya ukaguzi tu (hakuna ukarabati uliofanyika).';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, message)
  VALUES (NEW.user_id, _type, _message);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status_change();