-- 20260608145119_efba8314-44ba-433b-bd18-ed24048dfda9.sql

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  brand_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  start_date DATE NOT NULL,
  expected_end_date DATE,
  scope TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX projects_user_idx ON public.projects(user_id, created_at DESC);

CREATE TABLE public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  workers TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_logs TO authenticated;
GRANT ALL ON public.work_logs TO service_role;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.work_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX work_logs_project_idx ON public.work_logs(project_id, date DESC);

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'during',
  storage_path TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX photos_project_idx ON public.photos(project_id, created_at DESC);

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL DEFAULT '??,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own materials" ON public.materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX materials_project_idx ON public.materials(project_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, brand_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), '?曉蝝??);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage RLS for photos bucket (bucket created separately)
CREATE POLICY "own folder read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own folder insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own folder delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 20260608145145_87b9103e-f8dd-4262-9ba5-c1ef5022cf9d.sql

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 20260608173134_6fa63263-9e2f-4bf2-90c7-02976c0b6cc0.sql
-- Watermark preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS watermark_enabled boolean NOT NULL DEFAULT true;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all profiles
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed: make the first existing user admin (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

-- 20260608173200_7f56493d-0838-46a7-b79b-60d79ede3968.sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 20260608174107_88145d20-7593-444f-b64c-f4053f69e4a2.sql

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  ai_answer text,
  status text NOT NULL DEFAULT 'answered',
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users insert own support messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins update support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_support_messages_updated
BEFORE UPDATE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 20260608180525_2e8ea4c9-d373-4971-811d-c69c31c832c7.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canned_responses TO authenticated;
GRANT ALL ON public.canned_responses TO service_role;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage canned" ON public.canned_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_canned_updated BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "avatars authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars users upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars users update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars users delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 20260608183043_6a6508c5-3982-4202-b946-c3bb3a5160ff.sql
ALTER TABLE public.support_messages ALTER COLUMN question DROP NOT NULL;

-- 20260608183926_fcdcb147-24be-4ed1-a866-83a2ae1d00f1.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permission_level smallint NOT NULL DEFAULT 2;
COMMENT ON COLUMN public.profiles.permission_level IS '1=璆凋蜓(?汗), 2=撌乩犖, 3=撌亙銝颱遙, 4=蝞∠???;

-- 20260608185756_3fa34159-1601-435f-b3c6-1b01fad5e594.sql

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

-- 20260608185820_8d6e8198-095b-4c24-b1f7-0fcf25dbdb28.sql

REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_role(uuid, uuid) TO authenticated, service_role;

-- 20260608191434_2369a509-e13b-4b41-b431-6a91ca328758.sql
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 2 CHECK (level BETWEEN 1 AND 4);

-- 20260608192748_067b3fba-beef-480a-9568-6a24e20e44db.sql

-- Revoke from PUBLIC and anon on all SECURITY DEFINER helper functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.team_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;

-- Re-grant only what's needed for RLS evaluation by signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;

-- 20260608195352_8cc47554-d791-4fbc-af8c-fa5c0498b605.sql

-- 1) Add image_url to support_messages
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2) Storage policies for support uploads under photos bucket: support/{customer_user_id}/...
DROP POLICY IF EXISTS "support read photos" ON storage.objects;
DROP POLICY IF EXISTS "support insert photos" ON storage.objects;
DROP POLICY IF EXISTS "support delete photos" ON storage.objects;

CREATE POLICY "support read photos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'support'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "support insert photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'support'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "support delete photos" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'support'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 3) Team invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor','viewer')),
  level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manage team invitations" ON public.team_invitations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_invitations.team_id AND t.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_invitations.team_id AND t.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS team_invitations_team_id_idx ON public.team_invitations(team_id);

-- 20260608202212_5db5dc34-246d-4a30-b0aa-a858b7a9ec03.sql

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

-- 20260608205701_5f067dab-a951-4d77-a575-cd7f350b26af.sql

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

-- 20260609013345_c354a7ba-5dd0-4bc9-bdde-f041bdaa33c1.sql

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

-- 20260609015652_81f40a5d-672f-4e92-85c4-b25cb083b458.sql

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

-- 20260609071530_4db5acbc-6f90-4baa-9ef2-b89b0a59c723.sql
-- Share link fields on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_share_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_show_amounts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_show_materials boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token) WHERE share_token IS NOT NULL;

-- 20260609073719_de99d38f-da9e-45e2-86f7-9a6c78dd4249.sql

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
  IF _uid IS NULL THEN RAISE EXCEPTION '隢??餃'; END IF;

  SELECT * INTO _row FROM public.subscription_codes WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '摨?銝???; END IF;
  IF _row.redeemed_by IS NOT NULL THEN
    IF _row.redeemed_by = _uid THEN
      RETURN jsonb_build_object('ok', true, 'already', true);
    END IF;
    RAISE EXCEPTION '摨?撌脰◤雿輻';
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE id = _row.subscription_id;
  IF _sub.expires_at <= now() THEN RAISE EXCEPTION '甇方??勗歇??'; END IF;
  IF _sub.owner_user_id = _uid THEN RAISE EXCEPTION '?冽銝餃董??銝?閬?????; END IF;

  UPDATE public.subscription_codes
    SET redeemed_by = _uid, redeemed_at = now()
    WHERE id = _row.id;

  RETURN jsonb_build_object('ok', true, 'expires_at', _sub.expires_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_subscription_code(text) TO authenticated;

-- 20260609081418_7910b44c-8f2f-417f-a31c-a65116a8955a.sql

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

-- 20260609140000_create_storage_buckets.sql
-- Storage buckets required by the app (photos, avatars).
-- RLS policies for these buckets are defined in earlier migrations.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos', 'photos', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]),
  ('avatars', 'avatars', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

