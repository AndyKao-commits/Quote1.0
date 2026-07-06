-- Offline license device bindings (service role only; used when VITE_LOCAL_FIRST=true)
CREATE TABLE IF NOT EXISTS public.offline_license_devices (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

ALTER TABLE public.offline_license_devices ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.offline_license_devices TO service_role;

CREATE INDEX IF NOT EXISTS offline_license_devices_user_idx
  ON public.offline_license_devices (user_id);
