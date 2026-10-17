/*
# Remove nonexistent channel references from admin boost-order functions

featured_orders has no channel_id column (boosts are startup-only).
Both functions rewritten to join startups only.
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
      'kind', 'startup',
      'listing_name', s.name,
      'listing_url', s.url,
      'plan', o.plan,
      'amount_cents', ROUND(o.amount_usd * 100)::int,
      'currency', 'usd',
      'payment_method', o.payment_method,
      'payment_reference', o.payment_reference,
      'status', o.status,
      'contact_email', o.contact_email,
      'featured_until', o.featured_until,
      'created_at', o.created_at,
      'startup_id', o.startup_id
    ) AS row
    FROM featured_orders o
    LEFT JOIN startups s ON s.id = o.startup_id
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
  v_startup_id uuid;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_action NOT IN ('verify', 'reject', 'reactivate', 'expire') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT status, tier_days, startup_id
  INTO v_status, v_tier_days, v_startup_id
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
    IF v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
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
    IF v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
    END IF;
  ELSIF p_action = 'expire' THEN
    UPDATE featured_orders SET status = 'expired', featured_until = NULL WHERE id = p_id;
    IF v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = false WHERE id = v_startup_id;
    END IF;
  END IF;
END;
$$;
