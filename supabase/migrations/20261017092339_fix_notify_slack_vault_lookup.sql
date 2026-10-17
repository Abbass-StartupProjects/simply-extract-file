/*
# Fix Slack helper to read base URL and anon key from vault

1. Changes
- Rewrites `public.notify_slack` to pull the project base URL and anon key from
  `vault.secrets` (names `app_base_url`, `app_anon_key`) instead of custom GUCs,
  which are not settable on hosted Supabase.
- Decrypts with the same vault crypto verified during setup.
- Behavior is otherwise unchanged: silently skips when slack_settings has no
  enabled webhook.

2. Security
- Still SECURITY DEFINER with pinned search_path; secrets stay server-side and are
  never exposed to clients.
*/

CREATE OR REPLACE FUNCTION public.notify_slack(p_type text, p_title text, p_lines jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_base_url text;
  v_anon_key text;
BEGIN
  SELECT webhook_url INTO v_url FROM public.slack_settings WHERE id = 1 AND enabled = true;
  IF v_url IS NULL OR v_url = '' THEN
    RETURN;
  END IF;

  SELECT convert_from(
    vault._crypto_aead_det_decrypt(
      message := decode(secret, 'base64'),
      additional := convert_to(id::text, 'utf8'),
      key_id := 0,
      context := 'pgsodium'::bytea,
      nonce := nonce
    ), 'utf8'
  ) INTO v_base_url
  FROM vault.secrets WHERE name = 'app_base_url' LIMIT 1;

  SELECT convert_from(
    vault._crypto_aead_det_decrypt(
      message := decode(secret, 'base64'),
      additional := convert_to(id::text, 'utf8'),
      key_id := 0,
      context := 'pgsodium'::bytea,
      nonce := nonce
    ), 'utf8'
  ) INTO v_anon_key
  FROM vault.secrets WHERE name = 'app_anon_key' LIMIT 1;

  IF v_base_url IS NULL OR v_anon_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_base_url || '/functions/v1/slack-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object('type', p_type, 'title', p_title, 'lines', p_lines),
    timeout_milliseconds := 5000
  );
END;
$$;
