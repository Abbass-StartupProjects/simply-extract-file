/*
# Remove unused payment-bypass function and revoke stale grants

1. Why
- activate_featured_listing(p_startup_id, p_days, p_order_id) let the
  startup's owner flip featured_until/is_featured and mark their own
  order 'verified' with no admin verification step. It was written for
  an older self-serve flow that no longer exists: nothing in the app,
  edge functions, or triggers calls it. Leaving it callable lets any
  authenticated user bypass payment entirely.
- The admin_* definer functions and increment_* upvote functions remain
  intentionally callable by authenticated users (they gate internally on
  is_site_owner() / auth.uid()). That is by design; the linter warning
  for those is expected.

2. Changes
- DROP FUNCTION public.activate_featured_listing(uuid, integer, uuid).

3. Security
- Removes an unauthenticated-to-payment bypass. No data affected.
*/

DROP FUNCTION IF EXISTS public.activate_featured_listing(uuid, integer, uuid);
