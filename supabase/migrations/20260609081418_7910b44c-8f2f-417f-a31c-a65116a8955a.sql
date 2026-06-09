
-- 1) Revoke EXECUTE from anon/public on SECURITY DEFINER functions that should not be callable anonymously
REVOKE EXECUTE ON FUNCTION public.current_membership_expiry(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_membership(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_subscription_code(text) FROM anon, public;

-- 2) Prevent token leakage on team_invitations via column-level grants.
--    Drop table-level SELECT for authenticated/anon, then grant SELECT only on safe columns.
REVOKE SELECT ON public.team_invitations FROM authenticated, anon;
GRANT SELECT (id, team_id, role, level, expires_at, created_by, created_at, used_at, used_by)
  ON public.team_invitations TO authenticated;

-- 3) Explicit deny: ensure canned_responses has no anon read. Keep admin ALL policy only.
REVOKE SELECT ON public.canned_responses FROM anon;
