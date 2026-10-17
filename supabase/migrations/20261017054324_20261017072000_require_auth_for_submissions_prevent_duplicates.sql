/*
# Require authentication for submissions + prevent duplicate listings

1. Purpose
- Require a signed-in account before anyone can submit a startup or channel.
- Record who submitted each listing so abuse can be traced and one account cannot hide behind anonymity.
- Prevent duplicate listings: no two startups or channels can share the same name or website URL.

2. Modified Tables
- `startups` — adds `submitted_by uuid` (nullable, defaults to the signed-in user on insert).
- `channels` — adds `submitted_by uuid` (nullable, defaults to the signed-in user on insert).

3. Security Changes
- INSERT on `startups` and `channels` is now restricted to authenticated users only; anonymous inserts are rejected.
- The INSERT policy checks that the signed-in user matches the recorded submitter.
- Existing seed listings keep their NULL submitted_by; reads remain public.

4. Duplicate Prevention
- Unique index on lowercased startup URL.
- Unique index on lowercased startup name.
- Unique index on lowercased channel URL.
- Unique index on lowercased channel name.
- These are checked at insert time so two accounts cannot submit the same startup or channel.

5. Data Safety
- No rows or columns are deleted.
- Existing listings remain visible and unchanged.
- The new column is nullable so seed data is not affected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'startups' AND column_name = 'submitted_by'
  ) THEN
    ALTER TABLE public.startups ADD COLUMN submitted_by uuid DEFAULT auth.uid();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'submitted_by'
  ) THEN
    ALTER TABLE public.channels ADD COLUMN submitted_by uuid DEFAULT auth.uid();
  END IF;
END $$;

-- Revoke anonymous INSERT on listings
REVOKE INSERT ON TABLE public.startups FROM anon;
REVOKE INSERT ON TABLE public.channels FROM anon;

-- Replace open INSERT policies with authenticated, ownership-checked policies
DROP POLICY IF EXISTS "anon_insert_startups" ON public.startups;
CREATE POLICY "auth_insert_startups" ON public.startups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "anon_insert_channels" ON public.channels;
CREATE POLICY "auth_insert_channels" ON public.channels FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = submitted_by);

-- Prevent duplicate startups by name and URL (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_startups_url_lower
  ON public.startups (lower(url));

CREATE UNIQUE INDEX IF NOT EXISTS unique_startups_name_lower
  ON public.startups (lower(name));

-- Prevent duplicate channels by name and URL (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_channels_url_lower
  ON public.channels (lower(url));

CREATE UNIQUE INDEX IF NOT EXISTS unique_channels_name_lower
  ON public.channels (lower(name));