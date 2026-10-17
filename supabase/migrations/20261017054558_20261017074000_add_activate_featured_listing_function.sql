/*
# Add activate_featured_listing function

1. Purpose
- Allow a signed-in founder to activate their own featured listing after submitting a boost order.
- Replace direct UPDATE on startups.featured_until which was revoked for security.

2. New Function
- `activate_featured_listing(p_startup_id uuid, p_days integer)` sets featured_until to now + p_days, but only if the caller is the submitter.

3. Security
- SECURITY DEFINER with fixed search_path.
- Checks auth.uid() = submitted_by before updating.
- Only executable by authenticated users.

4. Data Safety
- No rows deleted; only featured_until column updated on the caller's own listing.
*/

CREATE OR REPLACE FUNCTION public.activate_featured_listing(p_startup_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_days IS NULL OR p_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  SELECT (now() + make_interval(days => p_days)) INTO v_expires;

  UPDATE public.startups
  SET featured_until = v_expires
  WHERE id = p_startup_id AND submitted_by = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You can only boost your own listing';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_featured_listing(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_featured_listing(uuid, integer) TO authenticated;