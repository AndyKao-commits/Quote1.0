ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_schedule TEXT;
