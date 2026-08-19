-- ============================================================================
-- NUSA KASIR — Toko Online Persist per Google User (v2.2.34+86)
-- store_settings di-key oleh store_id (= activation key) saja, sehingga:
--   1. Clear data / re-login dengan akun sama bisa dapat key berbeda
--      (aktivasi offline / key baru) → setup hilang, diminta setup ulang.
--   2. Satu lisensi variant-agnostic bisa menimpa row toko antar varian
--      (last-writer-wins) → slug rebutan.
-- Fix: tambah user_id (Google UID) sebagai pemilik toko. Setiap (user_id,
-- variant) punya SATU row store_settings; store_id tetap dipertahankan
-- untuk kompatibilitas storefront & data lama (produk/order/customer).
--
-- Semua statement idempotent (IF NOT EXISTS) — aman dijalankan ulang.
-- Run: supabase db push (dari repo nusa-online — jangan dari nusa_kasir!)
-- ============================================================================

-- ── 1. store_settings: pemilik toko (Google UID) ───────────────────
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL; -- Google UID pemilik

-- Unik per (user_id, variant): satu toko per varian per user.
-- NULL user_id diizinkan banyak (row legacy sebelum migrasi ini).
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_user_variant
  ON public.store_settings(user_id, variant)
  WHERE user_id IS NOT NULL;
