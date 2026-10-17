/*
# Enable realtime vote updates for startups

1. Purpose
- The startup directory should re-rank itself live: when a startup receives a
  vote and overtakes others, every open browser should see it move up without
  reloading the page.

2. Changes
- Adds the `startups` table to the `supabase_realtime` publication, which is
  Supabase's mechanism for streaming row changes to connected clients.
- No tables, columns, or rows are added, modified, or removed.

3. Security
- No RLS changes. Realtime change events are delivered only to clients that can
  already read the row under Row Level Security, so the existing
  "public can view approved startups" policy continues to govern access.

4. Notes
- The statement is idempotent: it checks the publication catalog first and only
  alters the publication when the table is not already subscribed.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'startups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.startups;
  END IF;
END $$;
