-- ============================================================================
-- NUSA KASIR — Config Field Form Order Cetak + Logo Toko (v2.2.35+87)
-- 1. Tabel cadangan cloud untuk config field form per layanan percetakan.
--    App menyimpan fields_json per service di DB lokal
--    (print_service_types.fields_json) dan MENGUPLOAD salinannya ke sini
--    supaya tidak hilang saat clear-data / ganti device. Web tidak memakai.
-- 2. store_settings.logo_url — URL publik logo toko (upload bucket
--    nusa-images) supaya website bisa render <img> logo.
--
-- Key: (store_id, service_name) — satu config per layanan per toko.
-- Semua statement idempotent (IF NOT EXISTS) — aman dijalankan ulang.
-- Run: supabase db push (dari repo nusa-online — jangan dari nusa_kasir!)
-- ============================================================================

-- ── 1. store_settings: logo toko (URL publik dari storage) ──────────
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- ── 2. Tabel config field form per layanan ──────────────────────────
CREATE TABLE IF NOT EXISTS public.print_form_configs (
  id BIGSERIAL PRIMARY KEY,
  store_id TEXT NOT NULL,           -- activation key pemilik toko
  service_name TEXT NOT NULL,       -- nama layanan percetakan (Fotocopy, Banner, ...)
  fields_json TEXT DEFAULT NULL,    -- JSON list string: field form yang tampil
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unik per (store_id, service_name) — replace-all per store saat sync.
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_form_store_service
  ON public.print_form_configs(store_id, service_name);

-- Akses: service_role via edge function (bypass RLS). Anon TIDAK boleh
-- membaca/menulis — config ini privat milik toko.
ALTER TABLE public.print_form_configs ENABLE ROW LEVEL SECURITY;
