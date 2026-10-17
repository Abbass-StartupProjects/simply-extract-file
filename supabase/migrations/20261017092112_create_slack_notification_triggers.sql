/*
# Slack notification triggers

1. Behavior
- Creates a shared helper `public.notify_slack(p_type text, p_title text, p_lines jsonb)`
  that posts an event to the `slack-notify` edge function using pg_net (async HTTP).
- Creates four small trigger functions (one per table) that pass the row fields to it.
- Attaches AFTER INSERT triggers on startups, channels, tickets, and featured_orders.

2. Security
- The helpers are SECURITY DEFINER with a pinned search_path so triggers fire even when
  inserts come from RLS-restricted client sessions.
- No data is exposed to clients. The helper silently skips when Slack is not configured
  or notifications are disabled.

3. Notes
- pg_net extension is required and installed.
- Payloads are intentionally minimal (no user emails or message bodies).
*/

CREATE OR REPLACE FUNCTION public.notify_slack(p_type text, p_title text, p_lines jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  SELECT webhook_url INTO v_url FROM public.slack_settings WHERE id = 1 AND enabled = true;
  IF v_url IS NULL OR v_url = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/slack-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.anon_key', true), '')
    ),
    body := jsonb_build_object('type', p_type, 'title', p_title, 'lines', p_lines),
    timeout_milliseconds := 5000
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_slack_on_startup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_slack('startup', NEW.name, jsonb_build_array(
    'Tagline: ' || COALESCE(NEW.tagline, '-'),
    'URL: ' || COALESCE(NEW.url, '-'),
    'Stage: ' || COALESCE(NEW.stage, '-')
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_slack_on_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_slack('channel', NEW.name, jsonb_build_array(
    'URL: ' || COALESCE(NEW.url, '-'),
    'Audience: ' || COALESCE(NEW.audience_size, '-')
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_slack_on_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_slack('ticket', NEW.subject, jsonb_build_array(
    'Category: ' || COALESCE(NEW.category, '-'),
    'Status: ' || COALESCE(NEW.status, '-')
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_slack_on_boost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_slack('boost', 'Boost order for startup ' || NEW.startup_id, jsonb_build_array(
    'Tier: ' || NEW.tier_days || ' days',
    'Amount: ' || COALESCE(NEW.amount_usd::text, '-') || ' ' || COALESCE(NEW.currency, ''),
    'TX: ' || COALESCE(NEW.tx_hash, '-')
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS slack_notify_startup ON public.startups;
CREATE TRIGGER slack_notify_startup
AFTER INSERT ON public.startups
FOR EACH ROW EXECUTE FUNCTION public.notify_slack_on_startup();

DROP TRIGGER IF EXISTS slack_notify_channel ON public.channels;
CREATE TRIGGER slack_notify_channel
AFTER INSERT ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.notify_slack_on_channel();

DROP TRIGGER IF EXISTS slack_notify_ticket ON public.tickets;
CREATE TRIGGER slack_notify_ticket
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_slack_on_ticket();

DROP TRIGGER IF EXISTS slack_notify_boost ON public.featured_orders;
CREATE TRIGGER slack_notify_boost
AFTER INSERT ON public.featured_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_slack_on_boost();
