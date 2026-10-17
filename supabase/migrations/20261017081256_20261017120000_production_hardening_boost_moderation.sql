/*
# Production hardening: boost flow fix, content moderation, function updates

## 1. Fix activate_featured_listing function
- Add p_order_id parameter for idempotency (prevent double-activation)
- Remove auth.uid() check (edge function uses service role, verifies ownership server-side)
- Grant EXECUTE to service_role

## 2. Content moderation: default submissions to 'pending'
- Change column defaults from 'approved' to 'pending'
- Add CHECK constraint on status values
- Existing approved listings remain approved

## 3. Add submitted_by index for "my listings" queries

## 4. Add updated_at auto-trigger for tickets
*/

-- 1. Update activate_featured_listing to accept order_id and work with service role
CREATE OR REPLACE FUNCTION public.activate_featured_listing(p_startup_id uuid, p_days integer, p_order_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expires timestamptz;
BEGIN
  IF p_days IS NULL OR p_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  IF p_order_id IS NOT NULL THEN
    PERFORM 1 FROM public.featured_orders
    WHERE id = p_order_id AND status = 'verified';
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  SELECT (now() + make_interval(days => p_days)) INTO v_expires;

  UPDATE public.startups
  SET featured_until = v_expires,
      is_featured = true
  WHERE id = p_startup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.activate_featured_listing(uuid, integer, uuid) TO service_role;

-- 2. Content moderation: change defaults to 'pending'
ALTER TABLE public.channels ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.startups ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channels_status_check') THEN
    ALTER TABLE public.channels ADD CONSTRAINT channels_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'startups_status_check') THEN
    ALTER TABLE public.startups ADD CONSTRAINT startups_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 3. Index for "my listings" queries
CREATE INDEX IF NOT EXISTS idx_channels_submitted_by ON public.channels(submitted_by);
CREATE INDEX IF NOT EXISTS idx_startups_submitted_by ON public.startups(submitted_by);

-- 4. Auto-update updated_at trigger for tickets
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ticket_updated_at') THEN
    CREATE TRIGGER update_ticket_updated_at
      BEFORE UPDATE ON public.tickets
      FOR EACH ROW
      EXECUTE FUNCTION public.update_modified_column();
  END IF;
END $$;
