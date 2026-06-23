-- 項目庫套餐：工種 + 多筆細項
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'single';

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS package_lines JSONB;
