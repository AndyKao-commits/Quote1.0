ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'item';
