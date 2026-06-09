-- Share link fields on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_share_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_show_amounts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_show_materials boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token) WHERE share_token IS NOT NULL;
