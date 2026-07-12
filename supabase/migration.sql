-- ============================================================================
-- NUSA KASIR — Toko Online Supabase Migration
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- 1. Store settings — one row per NUSA installation
CREATE TABLE IF NOT EXISTS public.store_settings (
  id            BIGSERIAL PRIMARY KEY,
  store_id      TEXT NOT NULL UNIQUE,
  store_name    TEXT NOT NULL DEFAULT '',
  description   TEXT DEFAULT '',
  logo_url      TEXT DEFAULT '',
  banner_url    TEXT DEFAULT '',
  whatsapp      TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  open_hours    TEXT DEFAULT '08:00 - 21:00',
  is_active     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Online products — synced from Flutter app
CREATE TABLE IF NOT EXISTS public.online_products (
  id              BIGSERIAL PRIMARY KEY,
  store_id        TEXT NOT NULL REFERENCES public.store_settings(store_id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT DEFAULT 'Lainnya',
  price           INTEGER NOT NULL,
  stock           INTEGER DEFAULT 0,
  image_url       TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  is_published    BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_op_store ON public.online_products(store_id);
CREATE INDEX IF NOT EXISTS idx_op_published ON public.online_products(store_id, is_published);

-- 3. Online orders — placed by customers via website
CREATE TABLE IF NOT EXISTS public.online_orders (
  id              BIGSERIAL PRIMARY KEY,
  store_id        TEXT NOT NULL REFERENCES public.store_settings(store_id) ON DELETE CASCADE,
  invoice         TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount        INTEGER DEFAULT 0,
  promo_code      TEXT DEFAULT '',
  handling_fee    INTEGER DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  payment_method  TEXT DEFAULT 'Tunai',
  pickup_time     TEXT DEFAULT 'Segera',
  branch          TEXT DEFAULT 'Pusat',
  notes           TEXT DEFAULT '',
  status          TEXT DEFAULT 'Online Baru',
  processed_by    TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oo_store ON public.online_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_oo_status ON public.online_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_oo_phone ON public.online_orders(store_id, customer_phone);

-- 4. Enable Realtime on orders (Flutter live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_orders;

-- 5. RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- Public: read active store + published products (for website customers)
CREATE POLICY "public_read_active_store"
  ON public.store_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_published_products"
  ON public.online_products FOR SELECT
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM public.store_settings ss
    WHERE ss.store_id = online_products.store_id AND ss.is_active = true
  ));

-- Customer: insert orders + read own by phone
CREATE POLICY "public_insert_orders"
  ON public.online_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_read_own_orders"
  ON public.online_orders FOR SELECT
  USING (true);  -- customers track by phone (filtered in query)

-- Service (Flutter app via service_role): full access — no policies needed
-- Edge Functions use service_role to bypass RLS
