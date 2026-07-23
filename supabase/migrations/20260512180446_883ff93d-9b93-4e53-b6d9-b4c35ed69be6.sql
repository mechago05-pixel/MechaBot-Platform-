-- Drop service_prices table
DROP TABLE IF EXISTS public.service_prices CASCADE;

-- Drop pricing/payment columns from service_requests
ALTER TABLE public.service_requests
  DROP COLUMN IF EXISTS estimated_price_min,
  DROP COLUMN IF EXISTS estimated_price_max,
  DROP COLUMN IF EXISTS final_price,
  DROP COLUMN IF EXISTS payment_method;

-- Drop pricing/payment columns from orders
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS estimated_price,
  DROP COLUMN IF EXISTS payment_method;

-- Drop diagnosis fee from mechanic profiles
ALTER TABLE public.mechanic_profiles
  DROP COLUMN IF EXISTS diagnosis_fee;

-- Add is_blocked flag for admin suspend/block
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.mechanic_profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Update validate_service_request to remove price caps
CREATE OR REPLACE FUNCTION public.validate_service_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.description = regexp_replace(NEW.description, '<[^>]*>', '', 'g');
  END IF;
  IF NEW.car_model IS NOT NULL THEN
    NEW.car_model = regexp_replace(NEW.car_model, '<[^>]*>', '', 'g');
  END IF;

  IF NEW.category NOT IN ('engine', 'battery', 'flat-tire', 'not-starting',
                          'brakes', 'oil-change', 'overheating',
                          'strange-noise', 'lights', 'other') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;

  RETURN NEW;
END;
$function$;