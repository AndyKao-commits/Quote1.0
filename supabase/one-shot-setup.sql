-- Run once in Supabase Dashboard → SQL Editor → New query → Run
-- Fixes missing Storage buckets (photos + avatars) required by the app.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos', 'photos', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]),
  ('avatars', 'avatars', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verify
SELECT id, name, public FROM storage.buckets WHERE id IN ('photos', 'avatars');
