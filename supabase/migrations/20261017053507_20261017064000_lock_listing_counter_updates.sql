/*
# Lock listing counter updates behind vote functions

1. Purpose
- Prevent authenticated users from directly editing listing rows and changing vote totals.
- Keep the public directory submission behavior unchanged.

2. Security Changes
- Revoke general UPDATE permission on `channels` from authenticated users.
- Revoke general UPDATE permission on `startups` from authenticated users.
- Voting remains available only through the authenticated, one-vote-per-listing functions.

3. Data Safety
- No rows or columns are deleted.
- Existing listing reads and submissions remain available.
- Administrative moderation can be added later through a separately protected server-side path.
*/

REVOKE UPDATE ON TABLE public.channels FROM authenticated;
REVOKE UPDATE ON TABLE public.startups FROM authenticated;