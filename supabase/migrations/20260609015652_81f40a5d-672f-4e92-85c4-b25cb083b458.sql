
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, brand_name, avatar_url, watermark_enabled, updated_at) ON public.profiles TO authenticated;

REVOKE UPDATE ON public.projects FROM authenticated;
GRANT UPDATE (name, customer_name, customer_phone, address, start_date, expected_end_date, scope, note, status, team_id, updated_at) ON public.projects TO authenticated;

REVOKE SELECT ON public.team_invitations FROM authenticated;
GRANT SELECT (id, team_id, role, level, expires_at, created_by, created_at, used_at, used_by) ON public.team_invitations TO authenticated;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_permission_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_project_owner_hijack() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_invitation_token_on_use() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
