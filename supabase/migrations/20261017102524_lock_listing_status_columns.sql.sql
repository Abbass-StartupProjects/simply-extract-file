/*
# Lock down listing status and featured columns (admin-only control)

1. Changes
- Removes all client write privileges on `status`, `is_featured`, `upvotes`,
  `submitted_by`, `created_at`, and `id` on both `startups` and `channels`
  (startups additionally loses client INSERT on `featured_until`).
  Previously any signed-in user could insert a startup or channel with
  `status = 'approved'` (skipping the owner's moderation queue entirely) or
  set `featured_until` in the future (self-featuring their listing for free).
- The app's own submit forms send `upvotes` and `is_featured` explicitly;
  those fields are now computed by the database defaults instead, so the
  forms keep working unchanged (sending a column you have no INSERT grant on
  only errors if it is listed in the request — so the forms are updated to
  stop sending them in the same change).
- Sets database defaults for `upvotes` (0) and `is_featured` (false).

2. Security
- Moderation status and featured flags are now admin-only: only the site
  owner can change them, via the admin_* SECURITY DEFINER functions.
- UPDATE grants on these columns were already absent for clients.

3. Notes
- `submitted_by` keeps its database default of auth.uid(); clients no longer
  send it, closing a forged-ownership vector.
*/

ALTER TABLE public.startups ALTER COLUMN upvotes SET DEFAULT 0;
ALTER TABLE public.startups ALTER COLUMN is_featured SET DEFAULT false;
ALTER TABLE public.channels ALTER COLUMN upvotes SET DEFAULT 0;
ALTER TABLE public.channels ALTER COLUMN is_featured SET DEFAULT false;

REVOKE INSERT (status, is_featured, featured_until, upvotes, submitted_by, created_at, id) ON public.startups FROM anon, authenticated;
REVOKE INSERT (status, is_featured, upvotes, submitted_by, created_at, id) ON public.channels FROM anon, authenticated;
