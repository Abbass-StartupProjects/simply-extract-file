/*
# Performance hardening: RLS initplan + duplicate index

1. Changes
- Rewrites every RLS policy that called auth.uid() per-row to use
  (select auth.uid()) so Postgres evaluates it once per query instead of once
  per row (Supabase performance advisor lint 0003). Covers: channel_votes,
  startup_votes, startups, channels, tickets, ticket_replies, featured_orders.
- Policies that embed auth.uid() inside EXISTS subqueries are rewritten the
  same way.
- Drops one duplicate index on featured_orders flagged by the advisor.
- No behavioral change: same access rules, same roles, same predicates.

2. Security
- None. This is a pure performance migration; all predicates are identical.
*/

-- ---------- startups ----------
DROP POLICY IF EXISTS "anon_read_startups" ON public.startups;
CREATE POLICY "anon_read_startups" ON public.startups FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_startups" ON public.startups;
CREATE POLICY "auth_insert_startups" ON public.startups FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = submitted_by);

DROP POLICY IF EXISTS "update_own_startups" ON public.startups;
CREATE POLICY "update_own_startups" ON public.startups FOR UPDATE
TO authenticated
USING ((select auth.uid()) = submitted_by)
WITH CHECK ((select auth.uid()) = submitted_by);

-- ---------- channels ----------
DROP POLICY IF EXISTS "anon_read_channels" ON public.channels;
CREATE POLICY "anon_read_channels" ON public.channels FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_channels" ON public.channels;
CREATE POLICY "auth_insert_channels" ON public.channels FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = submitted_by);

DROP POLICY IF EXISTS "update_own_channels" ON public.channels;
CREATE POLICY "update_own_channels" ON public.channels FOR UPDATE
TO authenticated
USING ((select auth.uid()) = submitted_by)
WITH CHECK ((select auth.uid()) = submitted_by);

-- ---------- channel_votes ----------
DROP POLICY IF EXISTS "users_read_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_read_own_channel_votes" ON public.channel_votes FOR SELECT
TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_insert_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_insert_own_channel_votes" ON public.channel_votes FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_update_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_update_own_channel_votes" ON public.channel_votes FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_delete_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_delete_own_channel_votes" ON public.channel_votes FOR DELETE
TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- startup_votes ----------
DROP POLICY IF EXISTS "users_read_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_read_own_startup_votes" ON public.startup_votes FOR SELECT
TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_insert_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_insert_own_startup_votes" ON public.startup_votes FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_update_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_update_own_startup_votes" ON public.startup_votes FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_delete_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_delete_own_startup_votes" ON public.startup_votes FOR DELETE
TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- tickets ----------
DROP POLICY IF EXISTS "select_own_tickets" ON public.tickets;
CREATE POLICY "select_own_tickets" ON public.tickets FOR SELECT
TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_tickets" ON public.tickets;
CREATE POLICY "insert_own_tickets" ON public.tickets FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_tickets" ON public.tickets;
CREATE POLICY "update_own_tickets" ON public.tickets FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_tickets" ON public.tickets;
CREATE POLICY "delete_own_tickets" ON public.tickets FOR DELETE
TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- ticket_replies ----------
DROP POLICY IF EXISTS "select_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "select_own_ticket_replies" ON public.ticket_replies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "insert_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "insert_own_ticket_replies" ON public.ticket_replies FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id
  AND is_staff = false
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "delete_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "delete_own_ticket_replies" ON public.ticket_replies FOR DELETE
TO authenticated
USING (
  (select auth.uid()) = user_id
  AND is_staff = false
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = (select auth.uid())
  )
);

-- ---------- featured_orders ----------
DROP POLICY IF EXISTS "select_own_featured_orders" ON public.featured_orders;
CREATE POLICY "select_own_featured_orders" ON public.featured_orders FOR SELECT
TO authenticated USING ((select auth.uid()) = submitted_by);

DROP POLICY IF EXISTS "insert_own_featured_orders" ON public.featured_orders;
CREATE POLICY "insert_own_featured_orders" ON public.featured_orders FOR INSERT
TO authenticated WITH CHECK ((select auth.uid()) = submitted_by);

-- ---------- duplicate index ----------
DROP INDEX IF EXISTS public.idx_featured_orders_duplicate;
