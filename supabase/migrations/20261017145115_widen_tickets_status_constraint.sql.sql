-- Admin replies set status='answered', which violated the original
-- open/closed CHECK. Widen the allowed values (additive, no data change).
DO $$ BEGIN
  EXECUTE (
    SELECT format(
      'ALTER TABLE public.tickets DROP CONSTRAINT %I;
       ALTER TABLE public.tickets ADD CONSTRAINT %I CHECK (status IN %s);',
      conname, conname,
      format('(%L, %L, %L)', 'open', 'answered', 'closed')
    )
    FROM pg_constraint
    WHERE conrelid = 'public.tickets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
      AND pg_get_constraintdef(oid) LIKE '%CHECK%'
    LIMIT 1
  );
END $$;