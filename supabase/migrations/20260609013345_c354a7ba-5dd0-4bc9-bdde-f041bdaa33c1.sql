
-- 1. Fix broken team photo storage policy join
DROP POLICY IF EXISTS "team members read project photos" ON storage.objects;
CREATE POLICY "team members read project photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE (p.id)::text = (storage.foldername(storage.objects.name))[2]
      AND p.team_id IS NOT NULL
      AND public.is_team_member(p.team_id, auth.uid())
  )
);

-- 2. Prevent permission_level escalation on profiles
DROP POLICY IF EXISTS "own profile" ON public.profiles;

CREATE POLICY "own profile select"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "own profile insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "own profile delete"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_permission_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.permission_level IS DISTINCT FROM OLD.permission_level THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.permission_level := OLD.permission_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_permission_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_permission_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_permission_escalation();

CREATE POLICY "own profile update"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Allow invited users to look up their pending invitation token
-- (token is already cleared after use by the existing trigger; this lets the
-- recipient validate a token they already possess via the invite link)
DROP POLICY IF EXISTS "invited user reads own invitation" ON public.team_invitations;
-- Server-side acceptance flow uses supabaseAdmin, so we keep client SELECT minimal.
-- Re-create a policy that only exposes consumed invitations to the user that consumed them.
CREATE POLICY "invited user reads own invitation"
ON public.team_invitations FOR SELECT
TO authenticated
USING (used_by = auth.uid() AND used_at IS NOT NULL);

-- 4. Prevent team editors from hijacking project ownership
DROP POLICY IF EXISTS "update own or team-editable projects" ON public.projects;

CREATE OR REPLACE FUNCTION public.prevent_project_owner_hijack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF OLD.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the project owner can transfer ownership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_project_owner_hijack_trg ON public.projects;
CREATE TRIGGER prevent_project_owner_hijack_trg
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.prevent_project_owner_hijack();

CREATE POLICY "update own or team-editable projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (team_id IS NOT NULL AND public.team_role(team_id, auth.uid()) = ANY (ARRAY['owner','editor']))
)
WITH CHECK (
  (user_id = auth.uid())
  OR (team_id IS NOT NULL AND public.team_role(team_id, auth.uid()) = ANY (ARRAY['owner','editor']))
);
