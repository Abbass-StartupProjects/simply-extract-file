/*
# Toggleable votes: users can remove their own vote

1. Plain-English explanation
Previously a vote was permanent: the upvote button locked after clicking and
there was no way to take a vote back. This migration adds two database
functions that TOGGLE a vote: calling once adds the vote (and bumps the
listing's upvote counter by one); calling again removes the vote (and lowers
the counter by one, never below zero). The frontend now calls these for both
channels and startups, and the vote button becomes a toggle.

2. New Functions
- `toggle_channel_vote(p_channel_id uuid)` — SECURITY DEFINER. Requires an
  authenticated user. If the user has not voted on the channel, inserts their
  vote row and increments `channels.upvotes`. If they have already voted,
  deletes their vote row and decrements `channels.upvotes` (floored at 0).
  Returns the new upvote total as integer.
- `toggle_startup_vote(p_startup_id uuid)` — same behavior for startups.
- Both return also whether the resulting state is "voted", exposed through a
  companion view (see below) so the UI can render the correct button state
  even after a page refresh.

3. New View
- `my_votes` — returns `channel_id` and `startup_id` columns listing every
  listing the current authenticated user has voted for. SECURITY INVOKER, so
  it respects row level security: each user only ever sees their own votes.

4. Security
- Both functions derive the voter from `auth.uid()` and raise an exception
  for anonymous callers.
- EXECUTE granted to `authenticated` only.
- Functions use a fixed `public` search path.
- The `my_votes` view is SECURITY INVOKER (runs with the caller's rights);
  SELECT granted to `authenticated` only. Anonymous users cannot see it.
- No client ever gains direct UPDATE access to the `upvotes` counters — the
  counters remain writable only through these functions, preventing forgery.

5. Data Safety
- No tables, columns, or existing rows are modified or removed.
- Existing votes and counters are preserved exactly as they are.
- The old increment functions remain in place for compatibility; nothing
  calls them anymore after the accompanying frontend change.
*/

CREATE OR REPLACE FUNCTION public.toggle_channel_vote(p_channel_id uuid)
RETURNS TABLE (new_count integer, voted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_total integer;
  v_voted boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.channel_votes
    WHERE user_id = v_user AND channel_id = p_channel_id
  ) THEN
    DELETE FROM public.channel_votes
    WHERE user_id = v_user AND channel_id = p_channel_id;

    UPDATE public.channels
    SET upvotes = GREATEST(upvotes - 1, 0)
    WHERE id = p_channel_id
    RETURNING upvotes INTO v_total;
    v_voted := false;
  ELSE
    INSERT INTO public.channel_votes (user_id, channel_id)
    VALUES (v_user, p_channel_id)
    ON CONFLICT (user_id, channel_id) DO NOTHING;

    UPDATE public.channels
    SET upvotes = upvotes + 1
    WHERE id = p_channel_id
    RETURNING upvotes INTO v_total;
    v_voted := true;
  END IF;

  RETURN QUERY SELECT v_total, v_voted;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_startup_vote(p_startup_id uuid)
RETURNS TABLE (new_count integer, voted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_total integer;
  v_voted boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.startup_votes
    WHERE user_id = v_user AND startup_id = p_startup_id
  ) THEN
    DELETE FROM public.startup_votes
    WHERE user_id = v_user AND startup_id = p_startup_id;

    UPDATE public.startups
    SET upvotes = GREATEST(upvotes - 1, 0)
    WHERE id = p_startup_id
    RETURNING upvotes INTO v_total;
    v_voted := false;
  ELSE
    INSERT INTO public.startup_votes (user_id, startup_id)
    VALUES (v_user, p_startup_id)
    ON CONFLICT (user_id, startup_id) DO NOTHING;

    UPDATE public.startups
    SET upvotes = upvotes + 1
    WHERE id = p_startup_id
    RETURNING upvotes INTO v_total;
    v_voted := true;
  END IF;

  RETURN QUERY SELECT v_total, v_voted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_channel_vote(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.toggle_startup_vote(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.toggle_channel_vote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_startup_vote(uuid) TO authenticated;

DROP VIEW IF EXISTS public.my_votes;
CREATE VIEW public.my_votes
WITH (security_invoker = true)
AS
SELECT
  cv.channel_id,
  NULL::uuid AS startup_id
FROM public.channel_votes cv
WHERE cv.user_id = auth.uid()
UNION ALL
SELECT
  NULL::uuid AS channel_id,
  sv.startup_id
FROM public.startup_votes sv
WHERE sv.user_id = auth.uid();

REVOKE ALL ON public.my_votes FROM anon, public;
GRANT SELECT ON public.my_votes TO authenticated;
