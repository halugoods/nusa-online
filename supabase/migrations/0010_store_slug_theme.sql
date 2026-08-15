-- ============================================================================
-- NUSA KASIR — Toko Online: slug custom + variant + tema (Batch #9)
-- Menambahkan kolom slug/variant/theme ke store_settings untuk
-- URL storefront: /toko/{variant}/{slug} + warna mengikuti tema app.
-- Run di Supabase SQL Editor (idempotent — aman dijalankan ulang).
-- ============================================================================

-- 1. Kolom baru di store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS slug         TEXT,
  ADD COLUMN IF NOT EXISTS variant      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_id     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dark_color   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS soft_color   TEXT DEFAULT '';

-- 2. Unik per kombinasi variant + slug (slug bebas dipakai antar varian,
--    mis. "berkah-jaya" di kelontong & apotek tetap boleh — domain berbeda)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_variant_slug
  ON public.store_settings(variant, slug)
  WHERE slug IS NOT NULL AND slug <> '';

-- 3. Catatan backfill: kolom baru dibiarkan kosong dulu — app akan
--    mengirim variant + slug + tema saat pemilik toko menyimpan ulang
--    dari Pengaturan Toko Online (upsertStore). Tidak ada tebakan variant.

-- 4. RLS: pembaca publik boleh lihat kolom baru (select * sudah mencakup).
--    Tidak perlu policy baru — policy "public_read_active_store" sudah SELECT seluruh kolom.

-- 5. Verifikasi: SELECT store_id, store_name, variant, slug FROM store_settings;
