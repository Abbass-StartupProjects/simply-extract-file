/*
# Fix admin boost-order functions to match the real featured_orders schema

1. Bugs fixed
- admin_list_boost_orders and admin_update_boost_order referenced columns
  that do not exist on featured_orders (kind, listing_name, listing_url,
  amount_cents, updated_at, channel_id), so the admin Boost Orders tab
  failed to load at all.
- admin_update_boost_order only verified orders in 'pending', but the
  corrected payment flow now places user-submitted orders in 'submitted'.
  Verify now accepts both.
- Verify/reactivate used a hardcoded 14-day window; they now honor the
  order's tier_days (7/14/30).

2. Changes
- Both functions rewritten to derive listing info by joining startups/
  channels and to compute amount_cents from amount_usd. No schema change,
  no data change.

3. Security
- Unchanged: both remain SECURITY DEFINER, owner-gated via is_site_owner(),
  explicit search_path.
*/

CREATE OR REPLACE FUNCTION public.admin_list_boost_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders jsonb;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'status' IN ('pending','submitted')) DESC, (row->>'created_at') DESC), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'kind', CASE WHEN o.startup_id IS NOT NULL THEN 'startup' ELSE 'channel' END,
      'listing_name', COALESCE(s.name, c.name),
      'listing_url', COALESCE(s.url, c.url),
      'plan', o.plan,
      'amount_cents', ROUND(o.amount_usd * 100)::int,
      'currency', 'usd',
      'payment_method', o.payment_method,
      'payment_reference', o.payment_reference,
      'status', o.status,
      'contact_email', o.contact_email,
      'featured_until', o.featured_until,
      'created_at', o.created_at,
      'startup_id', o.startup_id,
      'channel_id', o.channel_id
    ) AS row
    FROM featured_orders o
    LEFT JOIN startups s ON s.id = o.startup_id
    LEFT JOIN channels c ON c.id = o.channel_id
  ) t;

  RETURN v_orders;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_boost_order(p_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_tier_days int;
  v_kind text;
  v_startup_id uuid;
  v_channel_id uuid;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_action NOT IN ('verify', 'reject', 'reactivate', 'expire') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT status, tier_days,
         CASE WHEN startup_id IS NOT NULL THEN 'startup' ELSE 'channel' END,
         startup_id, channel_id
  INTO v_status, v_tier_days, v_kind, v_startup_id, v_channel_id
  FROM featured_orders
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_action = 'verify' THEN
    IF v_status NOT IN ('pending', 'submitted') THEN
      RAISE EXCEPTION 'Only pending orders can be verified';
    END IF;
    UPDATE featured_orders
    SET status = 'verified',
        featured_until = now() + make_interval(days => COALESCE(v_tier_days, 14))
    WHERE id = p_id;
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = true WHERE id = v_channel_id;
    END IF;
  ELSIF p_action = 'reject' THEN
    IF v_status NOT IN ('pending', 'submitted') THEN
      RAISE EXCEPTION 'Only pending orders can be rejected';
    END IF;
    UPDATE featured_orders SET status = 'rejected' WHERE id = p_id;
  ELSIF p_action = 'reactivate' THEN
    IF v_status NOT IN ('verified', 'expired') THEN
      RAISE EXCEPTION 'Only verified or expired orders can be reactivated';
    END IF;
    UPDATE featured_orders
    SET status = 'verified',
        featured_until = now() + make_interval(days => COALESCE(v_tier_days, 14))
    WHERE id = p_id;
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = true WHERE id = v_channel_id;
    END IF;
  ELSIF p_action = 'expire' THEN
    UPDATE featured_orders SET status = 'expired', featured_until = NULL WHERE id = p_id;
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = false WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = false WHERE id = v_channel_id;
    END IF;
  END IF;
END;
$$;
