/*
# Lock down Slack notification functions and harden misc permissions

1. Bugs fixed
- notify_slack and the four trigger wrappers were SECURITY DEFINER and
  executable by anon + authenticated. Anyone could POST arbitrary
  type/title/lines and spam the site owner's Slack webhook.
  They are only meant to fire from triggers / service role.
- update_modified_column had a mutable search_path (security lint).
- is_site_owner was granted to authenticated but the client never calls
  it directly (admin gating happens in the edge function and inside
  admin_* definer functions, which run as owner regardless of ACL).

2. Changes
- REVOKE EXECUTE from anon, authenticated, public on the five notify
  functions; keep service_role + owner. Triggers are unaffected because
  trigger invocation does not check EXECUTE privilege.
- Recreate update_modified_column with a fixed search_path.
- REVOKE is_site_owner from authenticated.

3. Security
- Reduces unauthenticated reachability of privileged definer functions.
  No schema or data changes.
*/

REVOKE EXECUTE ON FUNCTION public.notify_slack(text, text, jsonb)
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_slack_on_boost()
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_slack_on_channel()
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_slack_on_startup()
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_slack_on_ticket()
  FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_site_owner() FROM authenticated;
