
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
