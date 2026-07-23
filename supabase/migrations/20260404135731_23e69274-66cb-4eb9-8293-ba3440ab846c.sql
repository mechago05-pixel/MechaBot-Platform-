
-- Create a trigger function that auto-creates notifications on service_request status changes
CREATE OR REPLACE FUNCTION public.notify_on_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _message text;
  _target_user uuid;
  _type text := 'order';
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine message and target based on new status
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
    WHEN 'completed' THEN
      _message := 'Fundi amemaliza kazi! Tafadhali mpe rating yako.';
      _target_user := NEW.client_id;
    WHEN 'cancelled' THEN
      -- Notify both parties
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
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_notify_request_status ON public.service_requests;
CREATE TRIGGER trg_notify_request_status
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_request_status_change();
