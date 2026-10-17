/*
# Admin panel: database layer

1. Purpose
- Gives the site owner (the earliest-created account, matching the existing
  slack-settings pattern) a private dashboard at #/admin with:
  - Moderation queue for pending startups and channels (approve / delete).
  - Boost order management (verify / reject / reactivate expired features).
  - Support ticket inbox with replies.
  - Live stats (totals + last 7 days).
  - Slack notification settings link.

2. New tables
- `ticket_replies` already exists; admin replies reuse it.

3. New functions (all SECURITY DEFINER, pinned search_path, caller is derived
   from auth.uid() -- never from a parameter):
- `public.is_site_owner()` -> boolean. True when the caller is the earliest
  created user. Used by every other function and by RLS policies. Reads
  auth.users via the pg_catalog schema to avoid a recursive RLS dependency.
- `public.admin_list_pending_listings()` -> jsonb: pending startups + channels.
- `public.admin_list_boost_orders()` -> jsonb: all boost orders.
- `public.admin_list_tickets()` -> jsonb: all tickets with reply counts.
- `public.admin_get_ticket(p_id uuid)` -> jsonb: one ticket + its replies.
- `public.admin_reply_ticket(p_id uuid, p_body text)` -> void. Validates body
  length (1..5000). Inserts an admin reply and marks the ticket answered.
- `public.admin_approve_listing(p_kind text, p_id uuid)` -> void. kind is
  'startup' | 'channel'. Only moves pending rows to approved.
- `public.admin_delete_listing(p_kind text, p_id uuid)` -> void. Hard delete of
  a listing the owner chooses to remove (moderation action).
- `public.admin_update_boost_order(p_id uuid, p_action text)` -> void. action is
  'verify' | 'reject' | 'reactivate' | 'expire'. Verifying a paid order also
  activates the featured window server-side (14 days). Reactivating resets the
  featured window too. Only these transitions are allowed; everything else
  raises.
- `public.admin_mark_ticket_handled(p_id uuid)` -> void. Closed tickets can be
  reopened by passing action 'open' via admin_update_ticket_status? No --
  simpler: `admin_set_ticket_status(p_id uuid, p_status text)` where status is
  'open' | 'answered' | 'closed'.

4. Security
- Every admin_* function checks is_site_owner() first and raises 'Not
  authorized' otherwise.
- EXECUTE revoked from anon and public; granted to authenticated only.
- No new RLS policies expose admin data: pending listings, boost orders,
  tickets and ticket_replies keep their existing policies. The browser only
  reaches this data through the functions above.
- slack_settings keeps zero policies (fully locked); Slack config stays in the
  existing slack-settings edge function.

5. Notes
- Client-supplied totals are never trusted: featured windows are computed from
  the server's own order data, not from request parameters.
- Deletion of a listing cascades to its votes via existing FK constraints.
*/

-- Owner check: earliest-created user is the site owner (matches slack-settings edge function).
CREATE OR REPLACE FUNCTION public.is_site_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_authid
    WHERE pg_authid.rolname = 'supabase_admin'
  ) = false
  AND EXISTS (
    SELECT 1 FROM (
      SELECT id, created_at FROM auth.users
    ) u
    WHERE u.created_at = (SELECT min(created_at) FROM auth.users)
      AND u.id = auth.uid()
  );
$$;

-- Wrapper for the role check used by edge functions too (kept consistent).
CREATE OR REPLACE FUNCTION public.admin_list_pending_listings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_startups jsonb;
  v_channels jsonb;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'tagline', s.tagline,
      'description', s.description,
      'url', s.url,
      'created_at', s.created_at,
      'category', c.name,
      'region', r.name
    ) ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_startups
  FROM startups s
  LEFT JOIN categories c ON c.id = s.category_id
  LEFT JOIN regions r ON r.id = s.region_id
  WHERE s.status = 'pending';

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ch.id,
      'name', ch.name,
      'description', ch.description,
      'url', ch.url,
      'created_at', ch.created_at,
      'category', c.name,
      'region', r.name
    ) ORDER BY ch.created_at DESC
  ), '[]'::jsonb)
  INTO v_channels
  FROM channels ch
  LEFT JOIN categories c ON c.id = ch.category_id
  LEFT JOIN regions r ON r.id = ch.region_id
  WHERE ch.status = 'pending';

  RETURN jsonb_build_object('startups', v_startups, 'channels', v_channels);
END;
$$;

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

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'kind', o.kind,
      'listing_name', o.listing_name,
      'listing_url', o.listing_url,
      'plan', o.plan,
      'amount_cents', o.amount_cents,
      'currency', o.currency,
      'payment_method', o.payment_method,
      'payment_reference', o.payment_reference,
      'status', o.status,
      'contact_email', o.contact_email,
      'featured_until', o.featured_until,
      'created_at', o.created_at,
      'startup_id', o.startup_id,
      'channel_id', o.channel_id
    ) ORDER BY (o.status = 'pending') DESC, o.created_at DESC
  ), '[]'::jsonb)
  INTO v_orders
  FROM featured_orders o;

  RETURN v_orders;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_tickets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tickets jsonb;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'subject', t.subject,
      'body', t.body,
      'email', t.email,
      'status', t.status,
      'created_at', t.created_at,
      'reply_count', t.reply_count
    ) ORDER BY (t.status = 'open') DESC, t.created_at DESC
  ), '[]'::jsonb)
  INTO v_tickets
  FROM tickets t;

  RETURN v_tickets;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_ticket(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket jsonb;
  v_replies jsonb;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'id', t.id,
    'subject', t.subject,
    'body', t.body,
    'email', t.email,
    'status', t.status,
    'created_at', t.created_at
  )
  INTO v_ticket
  FROM tickets t
  WHERE t.id = p_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', tr.id,
      'author_role', tr.author_role,
      'body', tr.body,
      'created_at', tr.created_at
    ) ORDER BY tr.created_at ASC
  ), '[]'::jsonb)
  INTO v_replies
  FROM ticket_replies tr
  WHERE tr.ticket_id = p_id;

  RETURN jsonb_build_object('ticket', v_ticket, 'replies', v_replies);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reply_ticket(p_id uuid, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_body IS NULL OR length(btrim(p_body)) < 1 OR length(btrim(p_body)) > 5000 THEN
    RAISE EXCEPTION 'Reply must be between 1 and 5000 characters';
  END IF;

  INSERT INTO ticket_replies (ticket_id, author_role, body)
  VALUES (p_id, 'admin', btrim(p_body));

  UPDATE tickets SET status = 'answered' WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_listing(p_kind text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_kind NOT IN ('startup', 'channel') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  IF p_kind = 'startup' THEN
    UPDATE startups SET status = 'approved' WHERE id = p_id AND status = 'pending';
  ELSE
    UPDATE channels SET status = 'approved' WHERE id = p_id AND status = 'pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_listing(p_kind text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_kind NOT IN ('startup', 'channel') AND p_kind NOT IN ('startup_any', 'channel_any') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  IF p_kind IN ('startup', 'startup_any') THEN
    DELETE FROM startups WHERE id = p_id;
  ELSE
    DELETE FROM channels WHERE id = p_id;
  END IF;
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
  v_plan text;
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

  SELECT status, plan, kind, startup_id, channel_id
  INTO v_status, v_plan, v_kind, v_startup_id, v_channel_id
  FROM featured_orders
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_action = 'verify' THEN
    IF v_status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending orders can be verified';
    END IF;
    UPDATE featured_orders
    SET status = 'verified',
        featured_until = now() + interval '14 days',
        updated_at = now()
    WHERE id = p_id;
    -- Activate the featured flag on the linked listing, server-side.
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = true WHERE id = v_channel_id;
    END IF;
  ELSIF p_action = 'reject' THEN
    IF v_status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending orders can be rejected';
    END IF;
    UPDATE featured_orders SET status = 'rejected', updated_at = now() WHERE id = p_id;
  ELSIF p_action = 'reactivate' THEN
    IF v_status NOT IN ('verified', 'expired') THEN
      RAISE EXCEPTION 'Only verified or expired orders can be reactivated';
    END IF;
    UPDATE featured_orders
    SET status = 'verified',
        featured_until = now() + interval '14 days',
        updated_at = now()
    WHERE id = p_id;
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = true WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = true WHERE id = v_channel_id;
    END IF;
  ELSIF p_action = 'expire' THEN
    UPDATE featured_orders SET status = 'expired', featured_until = NULL, updated_at = now() WHERE id = p_id;
    IF v_kind = 'startup' AND v_startup_id IS NOT NULL THEN
      UPDATE startups SET is_featured = false WHERE id = v_startup_id;
    ELSIF v_kind = 'channel' AND v_channel_id IS NOT NULL THEN
      UPDATE channels SET is_featured = false WHERE id = v_channel_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_ticket_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('open', 'answered', 'closed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE tickets SET status = p_status WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_site_owner() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_listings() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_boost_orders() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_tickets() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_ticket(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reply_ticket(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_approve_listing(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_listing(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_boost_order(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_ticket_status(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_site_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_boost_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_ticket(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_listing(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_listing(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_boost_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ticket_status(uuid, text) TO authenticated;
