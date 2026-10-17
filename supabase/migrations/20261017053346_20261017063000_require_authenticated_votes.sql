/*
# Require authenticated, one-time votes

1. Purpose
- Require an authenticated account before a visitor can upvote.
- Store each account's vote durably so browser storage cannot be cleared to vote again.
- Keep listing counters accurate under concurrent voting.

2. New Tables
- `channel_votes` records one vote per user and channel.
- `startup_votes` records one vote per user and startup.
- Each table has a unique `(user_id, listing_id)` pair and timestamps.

3. New Functions
- `increment_channel_upvotes(uuid)` checks authentication, records one channel vote, and atomically increments the channel counter only for a new vote.
- `increment_startup_upvotes(uuid)` does the same for startups.

4. Security
- Row-level security is enabled on both vote tables.
- Authenticated users can read, create, update, and delete only their own vote records.
- Anonymous users cannot execute either vote function.
- The functions use a fixed `public` search path and derive the voter from `auth.uid()`.

5. Data Safety
- Existing listings and counters are preserved.
- Existing duplicate-free browser votes are not imported because they cannot be safely attributed to accounts.
*/

CREATE TABLE IF NOT EXISTS public.channel_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

ALTER TABLE public.channel_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_read_own_channel_votes" ON public.channel_votes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_insert_own_channel_votes" ON public.channel_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_update_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_update_own_channel_votes" ON public.channel_votes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_channel_votes" ON public.channel_votes;
CREATE POLICY "users_delete_own_channel_votes" ON public.channel_votes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.startup_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, startup_id)
);

ALTER TABLE public.startup_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_read_own_startup_votes" ON public.startup_votes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_insert_own_startup_votes" ON public.startup_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_update_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_update_own_startup_votes" ON public.startup_votes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_startup_votes" ON public.startup_votes;
CREATE POLICY "users_delete_own_startup_votes" ON public.startup_votes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_channel_upvotes(p_channel_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.channel_votes (user_id, channel_id)
  VALUES (auth.uid(), p_channel_id)
  ON CONFLICT (user_id, channel_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT upvotes INTO new_total FROM public.channels WHERE id = p_channel_id;
    RETURN new_total;
  END IF;

  UPDATE public.channels
  SET upvotes = upvotes + 1
  WHERE id = p_channel_id
  RETURNING upvotes INTO new_total;

  RETURN new_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_startup_upvotes(p_startup_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.startup_votes (user_id, startup_id)
  VALUES (auth.uid(), p_startup_id)
  ON CONFLICT (user_id, startup_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT upvotes INTO new_total FROM public.startups WHERE id = p_startup_id;
    RETURN new_total;
  END IF;

  UPDATE public.startups
  SET upvotes = upvotes + 1
  WHERE id = p_startup_id
  RETURNING upvotes INTO new_total;

  RETURN new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_channel_upvotes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_channel_upvotes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_startup_upvotes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_startup_upvotes(uuid) TO authenticated;