
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_seats int NOT NULL CHECK (plan_seats IN (3,6,9,12)),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_by_admin boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscription codes (one per seat)
CREATE TABLE public.subscription_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_codes TO authenticated;
GRANT ALL ON public.subscription_codes TO service_role;

ALTER TABLE public.subscription_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read codes they own or redeemed"
  ON public.subscription_codes FOR SELECT TO authenticated
  USING (
    redeemed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX subscription_codes_sub_idx ON public.subscription_codes(subscription_id);
CREATE INDEX subscriptions_owner_idx ON public.subscriptions(owner_user_id);

-- Generate random code helper
CREATE OR REPLACE FUNCTION public.gen_subscription_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    IF i IN (4,8,12) THEN result := result || '-'; END IF;
  END LOOP;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gen_subscription_code() FROM PUBLIC, anon, authenticated;

-- Has active membership
CREATE OR REPLACE FUNCTION public.has_active_membership(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.expires_at > now()
      AND (
        s.owner_user_id = _user
        OR EXISTS (
          SELECT 1 FROM public.subscription_codes c
          WHERE c.subscription_id = s.id AND c.redeemed_by = _user
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_membership(uuid) TO authenticated;

-- Current expiry helper (latest expiry across owned + redeemed)
CREATE OR REPLACE FUNCTION public.current_membership_expiry(_user uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(s.expires_at) FROM public.subscriptions s
  WHERE s.expires_at > now()
    AND (
      s.owner_user_id = _user
      OR EXISTS (
        SELECT 1 FROM public.subscription_codes c
        WHERE c.subscription_id = s.id AND c.redeemed_by = _user
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_membership_expiry(uuid) TO authenticated;

-- Redeem code function
CREATE OR REPLACE FUNCTION public.redeem_subscription_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.subscription_codes;
  _sub public.subscriptions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;

  SELECT * INTO _row FROM public.subscription_codes WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '序號不存在'; END IF;
  IF _row.redeemed_by IS NOT NULL THEN
    IF _row.redeemed_by = _uid THEN
      RETURN jsonb_build_object('ok', true, 'already', true);
    END IF;
    RAISE EXCEPTION '序號已被使用';
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE id = _row.subscription_id;
  IF _sub.expires_at <= now() THEN RAISE EXCEPTION '此訂閱已過期'; END IF;
  IF _sub.owner_user_id = _uid THEN RAISE EXCEPTION '您是主帳號，不需要兌換序號'; END IF;

  UPDATE public.subscription_codes
    SET redeemed_by = _uid, redeemed_at = now()
    WHERE id = _row.id;

  RETURN jsonb_build_object('ok', true, 'expires_at', _sub.expires_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_subscription_code(text) TO authenticated;
