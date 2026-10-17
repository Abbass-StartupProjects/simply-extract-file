/*
# Block disposable / temporary email domains at signup

1. Purpose
- Prevent scam and spam accounts by rejecting signups that use known disposable or temporary email providers.
- Enforcement happens in the database so it cannot be bypassed by calling the API directly.

2. New Tables
- `blocked_email_domains` stores the denylist of disposable email domains (e.g. mailinator.com, tempmail.com).
- Publicly readable (so the frontend can show which domains are blocked), writable only by authenticated users for future admin management.

3. New Functions
- `is_blocked_email(text)` returns true when the domain part of the supplied email is in the denylist. Case-insensitive.
- `reject_disposable_signup()` is a BEFORE INSERT trigger on `auth.users` that calls `is_blocked_email` and raises an exception for disposable domains, stopping the account from being created.

4. Security
- RLS enabled on `blocked_email_domains`: anon/authenticated can SELECT (public denylist), only authenticated can INSERT/UPDATE/DELETE.
- The trigger function is SECURITY DEFINER with a fixed `public` search_path.

5. Data Safety
- No existing users are affected; the trigger only runs on new inserts.
- No tables or columns are dropped.
*/

CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_blocked_domains" ON public.blocked_email_domains;
CREATE POLICY "anon_read_blocked_domains" ON public.blocked_email_domains FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_manage_blocked_domains" ON public.blocked_email_domains;
CREATE POLICY "auth_manage_blocked_domains" ON public.blocked_email_domains FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_blocked_domains" ON public.blocked_email_domains;
CREATE POLICY "auth_update_blocked_domains" ON public.blocked_email_domains FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_blocked_domains" ON public.blocked_email_domains;
CREATE POLICY "auth_delete_blocked_domains" ON public.blocked_email_domains FOR DELETE
  TO authenticated USING (true);

INSERT INTO public.blocked_email_domains (domain) VALUES
  ('mailinator.com'),
  ('guerrillamail.com'),
  ('guerrillamail.net'),
  ('guerrillamail.org'),
  ('guerrillamailblock.com'),
  ('grr.la'),
  ('sharklasers.com'),
  ('tempmail.com'),
  ('tempmail.net'),
  ('tempmail.org'),
  ('temp-mail.org'),
  ('tempmailo.com'),
  ('tempmailo.net'),
  ('10minutemail.com'),
  ('10minutemail.net'),
  ('throwaway.email'),
  ('throwawaymail.com'),
  ('yopmail.com'),
  ('yopmail.net'),
  ('getnada.com'),
  ('maildrop.cc'),
  ('dispostable.com'),
  ('mailnesia.com'),
  ('tempinbox.com'),
  ('mintemail.com'),
  ('mohmal.com'),
  ('emailondeck.com'),
  ('spam4.me'),
  ('trashmail.com'),
  ('trashmail.net'),
  ('trashmail.org'),
  ('emltmp.com'),
  ('tempr.email'),
  ('tmpmail.org'),
  ('tmpmail.net'),
  ('1secmail.com'),
  ('1secmail.net'),
  ('1secmail.org'),
  ('tempmailaddress.com'),
  ('emailfake.com'),
  ('incognitomail.com'),
  ('mailcatch.com'),
  ('jetable.org'),
  ('mail-temp.com'),
  ('tempemail.com'),
  ('discard.email'),
  ('temprmail.com'),
  ('tempmail.live'),
  ('mailo.icu'),
  ('inboxbear.com'),
  ('moakt.com'),
  ('moakt.ws'),
  ('temporary-mail.net'),
  ('emailtemp.com'),
  ('tmails.net'),
  ('tempail.com'),
  ('snapmail.cc'),
  ('luxusmail.org'),
  ('tempmailer.com'),
  ('catchemail.com'),
  ('burnmail.com'),
  ('instamail.com'),
  ('quickmail.com'),
  ('spambog.com'),
  ('spambog.ru'),
  ('spambog.de'),
  ('dropmail.me'),
  ('tempmail.us'),
  ('anonymous-email.com'),
  ('mailsac.com'),
  ('byom.de'),
  ('fakeinbox.com'),
  ('mailinator.net'),
  ('mailinator.org'),
  ('notmailinator.com'),
  ('tempmailo.com'),
  ('tempr.email'),
  ('email-temp.com'),
  ('temprmail.com'),
  ('tempinbox.com'),
  ('tmpmail.net'),
  ('fakebox.com'),
  ('linshiyou.com'),
  ('jiojoy.com'),
  ('smellypotato.com'),
  ('burnermail.io'),
  ('inboxproxy.com'),
  ('spamfree.com'),
  ('mailnull.com'),
  ('armyspy.com'),
  ('cuvox.com'),
  ('dayrep.com'),
  ('einrot.com'),
  ('fleckens.hu'),
  ('gustr.com'),
  ('jourrapide.com'),
  ('rhyta.com'),
  ('superrito.com'),
  ('teleworm.us')
ON CONFLICT (domain) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_blocked_email(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_email_domains
    WHERE domain = lower(split_part(p_email, '@', 2))
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_email(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_disposable_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_blocked_email(NEW.email) THEN
    RAISE EXCEPTION 'Disposable email addresses are not allowed';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_disposable_signup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_disposable_signup() TO authenticated, anon;

DROP TRIGGER IF EXISTS trg_block_disposable_signup ON auth.users;
CREATE TRIGGER trg_block_disposable_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_disposable_signup();