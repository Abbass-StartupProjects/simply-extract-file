/*
# Fix admin ticket functions to match the real tickets/ticket_replies schema

1. Bugs fixed
- admin_list_tickets and admin_get_ticket read columns that do not exist
  (tickets.body, tickets.email, tickets.reply_count), so the admin
  Support tickets tab failed entirely.
- admin_get_ticket read ticket_replies.author_role / .body, which do not
  exist (real columns: is_staff, message).
- admin_reply_ticket inserted author_role/body columns that do not exist,
  so every admin reply failed. It also only allowed inserting an admin
  reply; the reply author is derived from auth.uid().
- Admin detail view had no way to see the requester; the ticket owner is
  resolved via tickets.user_id -> auth.users email.

2. Changes
- All four functions rewritten against the real schema: message/is_staff/
  user_id columns, requester email resolved from auth.users, reply status
  updates kept.
- admin_reply_ticket now requires the ticket to exist and marks it
  answered; invalid ticket raises 'Not found'.

3. Security
- Unchanged: all four remain SECURITY DEFINER, owner-gated via
  is_site_owner(), fixed search_path. Length validation kept.
*/

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
      'body', t.message,
      'email', COALESCE(u.email, 'unknown'),
      'category', t.category,
      'status', t.status,
      'created_at', t.created_at,
      'reply_count', (SELECT count(*) FROM ticket_replies tr WHERE tr.ticket_id = t.id)
    ) ORDER BY (t.status = 'open') DESC, t.created_at DESC
  ), '[]'::jsonb)
  INTO v_tickets
  FROM tickets t
  LEFT JOIN auth.users u ON u.id = t.user_id;

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
    'body', t.message,
    'email', COALESCE(u.email, 'unknown'),
    'status', t.status,
    'created_at', t.created_at
  )
  INTO v_ticket
  FROM tickets t
  LEFT JOIN auth.users u ON u.id = t.user_id
  WHERE t.id = p_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', tr.id,
      'author_role', CASE WHEN tr.is_staff THEN 'admin' ELSE 'user' END,
      'body', tr.message,
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
DECLARE
  v_ticket_exists boolean;
BEGIN
  IF NOT public.is_site_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_body IS NULL OR length(btrim(p_body)) < 1 OR length(btrim(p_body)) > 5000 THEN
    RAISE EXCEPTION 'Reply must be between 1 and 5000 characters';
  END IF;

  SELECT EXISTS(SELECT 1 FROM tickets WHERE id = p_id) INTO v_ticket_exists;
  IF NOT v_ticket_exists THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  INSERT INTO ticket_replies (ticket_id, user_id, message, is_staff)
  VALUES (p_id, auth.uid(), btrim(p_body), true);

  UPDATE tickets SET status = 'answered' WHERE id = p_id;
END;
$$;
