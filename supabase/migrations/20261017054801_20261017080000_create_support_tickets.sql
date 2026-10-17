/*
# Create support tickets table

1. Purpose
- Allow users to submit feedback, report issues, or reach out to the team.
- Each ticket tracks subject, message, category, and status (open/closed).
- Users can view their own tickets and add follow-up replies.

2. New Tables
- `tickets` — main ticket record.
  - id (uuid PK)
  - user_id (uuid, defaults to authenticated user, references auth.users)
  - subject (text, required)
  - message (text, required)
  - category (text: bug, feedback, abuse, other; defaults to 'feedback')
  - status (text: open, closed; defaults to 'open')
  - created_at (timestamptz)
  - updated_at (timestamptz)
  - closed_at (timestamptz, nullable)
- `ticket_replies` — follow-up messages on a ticket.
  - id (uuid PK)
  - ticket_id (uuid FK to tickets, cascade delete)
  - user_id (uuid, defaults to authenticated user)
  - message (text, required)
  - is_staff (boolean, default false — reserved for admin replies)
  - created_at (timestamptz)

3. Security
- RLS enabled on both tables.
- Users can only see, create, and reply to their own tickets.
- Users can close their own tickets (UPDATE on status).
- Ticket replies are scoped through parent ticket ownership.
- All policies use TO authenticated with auth.uid() ownership checks.
- user_id columns default to auth.uid() so inserts work even when the client omits the field.

4. Data Safety
- No existing tables modified. No data lost.
*/

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'feedback' CHECK (category IN ('bug', 'feedback', 'abuse', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tickets" ON public.tickets;
CREATE POLICY "select_own_tickets" ON public.tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tickets" ON public.tickets;
CREATE POLICY "insert_own_tickets" ON public.tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tickets" ON public.tickets;
CREATE POLICY "update_own_tickets" ON public.tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tickets" ON public.tickets;
CREATE POLICY "delete_own_tickets" ON public.tickets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "select_own_ticket_replies" ON public.ticket_replies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "insert_own_ticket_replies" ON public.ticket_replies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_ticket_replies" ON public.ticket_replies;
CREATE POLICY "delete_own_ticket_replies" ON public.ticket_replies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);