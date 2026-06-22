CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  brand_color TEXT NOT NULL DEFAULT '#C45A3C',
  default_template TEXT NOT NULL DEFAULT 'craft',
  default_terms TEXT,
  default_show_tax_id BOOLEAN NOT NULL DEFAULT false,
  default_tax_included BOOLEAN NOT NULL DEFAULT false,
  default_show_tax_breakdown BOOLEAN NOT NULL DEFAULT false,
  seller_tax_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  address TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '式',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '報價單',
  template TEXT NOT NULL DEFAULT 'craft',
  status TEXT NOT NULL DEFAULT 'draft',
  client_name TEXT NOT NULL DEFAULT '',
  client_company TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_tax_id TEXT,
  client_address TEXT,
  show_seller_tax_id BOOLEAN NOT NULL DEFAULT false,
  show_buyer_tax_id BOOLEAN NOT NULL DEFAULT false,
  seller_tax_id TEXT,
  tax_included BOOLEAN NOT NULL DEFAULT false,
  show_tax_breakdown BOOLEAN NOT NULL DEFAULT false,
  tax_rate NUMERIC NOT NULL DEFAULT 0.05,
  valid_until DATE,
  note TEXT,
  terms TEXT,
  cover_image_url TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '式',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_lines TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own contacts" ON public.contacts;
CREATE POLICY "own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own catalog" ON public.catalog_items;
CREATE POLICY "own catalog" ON public.catalog_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own quotes" ON public.quotes;
CREATE POLICY "own quotes" ON public.quotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own quote lines" ON public.quote_lines;
CREATE POLICY "own quote lines" ON public.quote_lines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "public share read quotes" ON public.quotes;
CREATE POLICY "public share read quotes" ON public.quotes FOR SELECT USING (share_token IS NOT NULL);

DROP POLICY IF EXISTS "public share read lines" ON public.quote_lines;
CREATE POLICY "public share read lines" ON public.quote_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.share_token IS NOT NULL));

CREATE INDEX IF NOT EXISTS contacts_user_idx ON public.contacts(user_id, name);
CREATE INDEX IF NOT EXISTS catalog_user_idx ON public.catalog_items(user_id, sort_order);
CREATE INDEX IF NOT EXISTS quotes_user_idx ON public.quotes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_lines_quote_idx ON public.quote_lines(quote_id, sort_order);
CREATE INDEX IF NOT EXISTS quotes_share_token_idx ON public.quotes(share_token) WHERE share_token IS NOT NULL;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated ON public.contacts;
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_quotes_updated ON public.quotes;
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, company_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
