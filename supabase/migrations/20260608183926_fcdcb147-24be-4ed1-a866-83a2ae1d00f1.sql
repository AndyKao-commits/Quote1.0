ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permission_level smallint NOT NULL DEFAULT 2;
COMMENT ON COLUMN public.profiles.permission_level IS '1=業主(瀏覽), 2=工人, 3=工地主任, 4=管理員';