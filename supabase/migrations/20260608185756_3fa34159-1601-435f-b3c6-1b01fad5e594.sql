
-- 1. takeover_at on support_messages
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS takeover_at timestamptz;

-- 2. teams
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. team_id on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.is_team_member(_team uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.team_role(_team uuid, _user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.team_members WHERE team_id = _team AND user_id = _user LIMIT 1
$$;

-- 5. RLS for teams (avoid recursion via SECURITY DEFINER)
DROP POLICY IF EXISTS "teams visible to members" ON public.teams;
CREATE POLICY "teams visible to members" ON public.teams FOR SELECT
  TO authenticated USING (
    owner_id = auth.uid() OR public.is_team_member(id, auth.uid())
  );
DROP POLICY IF EXISTS "create own team" ON public.teams;
CREATE POLICY "create own team" ON public.teams FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner update team" ON public.teams;
CREATE POLICY "owner update team" ON public.teams FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "owner delete team" ON public.teams;
CREATE POLICY "owner delete team" ON public.teams FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- 6. RLS for team_members
DROP POLICY IF EXISTS "members read own teams" ON public.team_members;
CREATE POLICY "members read own teams" ON public.team_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR public.is_team_member(team_id, auth.uid())
  );
DROP POLICY IF EXISTS "owner manage members" ON public.team_members;
CREATE POLICY "owner manage members" ON public.team_members FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- 7. Projects: replace ALL policy with granular policies that include team members
DROP POLICY IF EXISTS "own projects" ON public.projects;
CREATE POLICY "view own or team projects" ON public.projects FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid()))
  );
CREATE POLICY "insert own projects" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND (
      team_id IS NULL
      OR public.team_role(team_id, auth.uid()) IN ('owner','editor')
    )
  );
CREATE POLICY "update own or team-editable projects" ON public.projects FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.team_role(team_id, auth.uid()) IN ('owner','editor'))
  );
CREATE POLICY "delete own projects" ON public.projects FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- 8. teams updated_at trigger
DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
