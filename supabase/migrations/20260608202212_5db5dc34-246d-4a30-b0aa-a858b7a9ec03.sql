
-- Allow team members to read shared project records
CREATE POLICY "team members read materials"
ON public.materials FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = materials.project_id
      AND p.team_id IS NOT NULL
      AND public.is_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "team members read work_logs"
ON public.work_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = work_logs.project_id
      AND p.team_id IS NOT NULL
      AND public.is_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "team members read photos"
ON public.photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = photos.project_id
      AND p.team_id IS NOT NULL
      AND public.is_team_member(p.team_id, auth.uid())
  )
);

-- Allow invited users to read invitations they have consumed (for confirmation UIs)
CREATE POLICY "invited user reads own invitation"
ON public.team_invitations FOR SELECT TO authenticated
USING (used_by = auth.uid());
