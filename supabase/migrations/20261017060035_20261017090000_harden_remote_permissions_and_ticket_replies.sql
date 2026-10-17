/*
# Harden public API permissions and ticket reply ownership

1. Purpose
- Remove unnecessary write access from shared reference tables and the disposable-email denylist.
- Prevent callers from invoking internal SECURITY DEFINER functions directly.
- Ensure ticket replies always belong to the signed-in user who created them and cannot be marked as staff replies.

2. Modified Tables
- `categories` and `regions`: remain publicly readable, but no longer accept client inserts, updates, or deletes.
- `blocked_email_domains`: remains publicly readable, but domain management is no longer available to ordinary signed-in users.
- `ticket_replies`: insert checks now require the caller to own the reply row and require `is_staff` to remain false.

3. Security Changes
- Revoke client execution of `is_blocked_email`, `reject_disposable_signup`, and `activate_featured_listing`.
- Trigger execution of the disposable-email functions remains available to PostgreSQL internally.
- Existing listing, voting, and ticket functionality is preserved except for the unsafe staff-reply mutation path.

4. Important Notes
- Featured activation is temporarily restricted to a protected server-side verification path. The existing function is retained without deleting data or code, but browser callers can no longer invoke it directly.
- No rows, columns, or tables are deleted.
*/

REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.regions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.blocked_email_domains FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.is_blocked_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_disposable_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_featured_listing(uuid, integer) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "insert_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "insert_own_ticket_replies" ON public.ticket_replies FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_staff = false
  AND EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE tickets.id = ticket_replies.ticket_id
      AND tickets.user_id = auth.uid()
  )
);

REVOKE INSERT ON public.ticket_replies FROM authenticated;
GRANT INSERT (ticket_id, message) ON public.ticket_replies TO authenticated;
