/*
# Slack notifications for admin actions

1. New Tables
- `slack_settings`: one row holding the operator's Slack Incoming Webhook URL and an on/off toggle.
  - `id` (integer, primary key, fixed to 1 - single row)
  - `webhook_url` (text, the Slack webhook to post to; null until configured)
  - `enabled` (boolean, master switch, default false)
  - `created_at`, `updated_at` (timestamps)

2. Security
- RLS enabled on `slack_settings`.
- No policies are added, so the table is fully locked for anon/authenticated clients:
  the webhook URL is a secret and must never be readable from the browser.
- The server-side `slack-notify` edge function reads it with the service role key.

3. Notes
- Triggers on startups, channels, tickets, and featured_orders are added in a follow-up
  migration and call the `slack-notify` edge function via pg_net.
*/

CREATE TABLE IF NOT EXISTS public.slack_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  webhook_url text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slack_settings ENABLE ROW LEVEL SECURITY;
