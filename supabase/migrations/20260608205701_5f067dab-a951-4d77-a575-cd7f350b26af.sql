
-- 1) Restrict invited user from reading the token column
DROP POLICY IF EXISTS "invited user reads own invitation" ON public.team_invitations;
CREATE POLICY "invited user reads own invitation" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (used_by = auth.uid() AND used_at IS NOT NULL);

-- Nullify token on consumption going forward via trigger
CREATE OR REPLACE FUNCTION public.clear_invitation_token_on_use()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.used_at IS NOT NULL AND NEW.used_by IS NOT NULL THEN
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_clear_invitation_token ON public.team_invitations;
CREATE TRIGGER trg_clear_invitation_token
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.clear_invitation_token_on_use();

-- Clear any already-consumed tokens
UPDATE public.team_invitations SET token = NULL WHERE used_at IS NOT NULL AND token IS NOT NULL;

-- 2) Allow team members to read photos from storage when project belongs to their team
CREATE POLICY "team members read project photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.team_id IS NOT NULL
        AND public.is_team_member(p.team_id, auth.uid())
    )
  );

-- 3) Explicit owner-scoped UPDATE policy for photos bucket
CREATE POLICY "own folder update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
