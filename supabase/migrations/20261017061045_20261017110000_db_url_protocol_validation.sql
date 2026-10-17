/*
# DB-level URL protocol validation — defense in depth

Client-side validation prevents javascript: URIs in submission forms, but
a direct API call could still insert malicious URLs. These CHECK constraints
enforce that all URLs stored in the database start with http:// or https://.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channels_url_protocol_check') THEN
    ALTER TABLE public.channels
      ADD CONSTRAINT channels_url_protocol_check
      CHECK (url ~ '^https?://');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'startups_url_protocol_check') THEN
    ALTER TABLE public.startups
      ADD CONSTRAINT startups_url_protocol_check
      CHECK (url ~ '^https?://');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'startups_logo_url_protocol_check') THEN
    ALTER TABLE public.startups
      ADD CONSTRAINT startups_logo_url_protocol_check
      CHECK (logo_url IS NULL OR logo_url ~ '^https?://');
  END IF;
END $$;
