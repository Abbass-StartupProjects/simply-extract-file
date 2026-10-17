/*
# Fix is_site_owner function

1. Changes
- Simplifies `public.is_site_owner()`: the previous version had a leftover
  condition referencing the `supabase_admin` catalog role that was both
  unnecessary and wrong on hosted projects (that role always exists, which
  would have made every admin function return "Not authorized"). The owner is
  the earliest-created auth user, matching the slack-settings edge function.
- No data or policy changes; all admin functions keep their behavior.

2. Security
- Still SECURITY DEFINER with pinned search_path; caller identity comes from
  auth.uid(), never from parameters.
*/

CREATE OR REPLACE FUNCTION public.is_site_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND created_at = (SELECT min(created_at) FROM auth.users)
  );
$$;
