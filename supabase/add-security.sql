-- 登入失敗次數限制（僅 service_role 可存取）
CREATE TABLE IF NOT EXISTS public.login_rate_limits (
  bucket TEXT PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.login_rate_limits TO service_role;

-- 分享連結過期時間
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS quotes_share_expires_idx
  ON public.quotes (share_expires_at)
  WHERE share_token IS NOT NULL;
