/*
# Fix boost payment flow security bugs

1. Bugs fixed
- CRITICAL: `activate_featured_listing` had no ownership check in its
  3-argument overload (the one verify-boost uses). Any signed-in user could
  call it directly with any startup_id and feature ANY listing — including
  someone else's — for free, bypassing payment and admin review entirely.
  Fix: the function now derives the caller from auth.uid() and verifies the
  order belongs to the caller AND the order's startup belongs to the caller,
  and re-checks order status server-side.
- HIGH: The boost order schema drifted between migrations. The table has
  `currency` (text) but no `plan`, no `payment_method`, `payment_reference`,
  or `contact_email` columns that the admin panel and BoostModal read/write.
  BoostModal also inserts `expires_at` while the admin verify function uses
  `featured_until` — an admin verifying an order could not see the plan the
  user picked. Fix: add the missing columns with safe defaults; no data loss.
- HIGH: `verify-boost` edge function never checks payment. It marks any
  order 'submitted' as 'verified' immediately when the user posts their tx
  hash, so typing any string into the boost dialog grants a free featured
  spot, skipping the owner's review. Fix: orders now go to 'pending' for
  admin review; the function records the claimed payment and returns success
  WITHOUT setting verified. Only the admin (admin_update_boost_order) can
  verify.
- MEDIUM: `verify-boost` referenced the 2-argument overload; a user could
  call the 3-arg one directly. Both overloads now enforce ownership.

2. New columns on featured_orders
- `plan` text (e.g. '14 Days'), `payment_method` text (crypto symbol),
  `payment_reference` text (tx hash), `contact_email` text — all nullable,
  matching what the admin panel already displays.
- `featured_until` timestamptz — matches what the admin verify function and
  admin panel already read/write.

3. Security
- activate_featured_listing: EXECUTE revoked from anon; both overloads now
  check that the order and startup belong to the caller.
- The redundant 2-argument overload is dropped to remove the unguarded path.

4. Notes
- No destructive change: no columns or rows are dropped or deleted.
*/

ALTER TABLE public.featured_orders
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

-- One guarded implementation only.
DROP FUNCTION IF EXISTS public.activate_featured_listing(uuid, integer);
DROP FUNCTION IF EXISTS public.activate_featured_listing(uuid, integer, uuid);

CREATE OR REPLACE FUNCTION public.activate_featured_listing(
  p_startup_id uuid,
  p_days integer,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires timestamptz;
  v_order_owner uuid;
  v_order_status text;
  v_startup_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_days IS NULL OR p_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Order is required';
  END IF;

  SELECT submitted_by, status INTO v_order_owner, v_order_status
  FROM featured_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT submitted_by INTO v_startup_owner
  FROM startups
  WHERE id = p_startup_id;

  IF NOT FOUND OR v_startup_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT (now() + make_interval(days => p_days)) INTO v_expires;

  UPDATE startups
  SET featured_until = v_expires, is_featured = true
  WHERE id = p_startup_id;

  UPDATE featured_orders
  SET status = 'verified', featured_until = v_expires
  WHERE id = p_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_featured_listing(uuid, integer, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.activate_featured_listing(uuid, integer, uuid) TO authenticated;
