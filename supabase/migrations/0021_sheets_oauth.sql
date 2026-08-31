-- ============================================================================
-- NUSA KASIR — Google Sheets OAuth Company Account (migrasi dari service
-- account ke OAuth refresh token pemilik NUSA)
-- ============================================================================
-- Service account Google menolak buat file native (Spreadsheet) di project
-- nusa-kasir-507208 karena `storageQuota.limit = 0` (403 storageQuotaExceeded).
-- Solusi: login Google OAuth sekali dari dashboard (company account,
-- drive.file scope, paste-code flow) → refresh token disimpan di
-- `sheets_settings` → server memakai refresh token untuk membuat & mengisi
-- spreadsheet atas nama akun pemilik NUSA.
--
-- Perubahan:
--   * sheets_settings + oauth_refresh_token (refresh token login Google admin)
--   * sheets_settings + oauth_owner_email  (email akun Google yang terhubung)
--   * service_account_json dibiarkan (data lama tidak dihapus — cuma tidak
--     dipakai lagi; kolom tetap ada supaya rollback aman).
-- ============================================================================

-- ── 1. Kolom OAuth di sheets_settings ──
alter table sheets_settings
  add column if not exists oauth_refresh_token text,
  add column if not exists oauth_owner_email text;

-- ── 2. Re-sync komentar kolom (opsional, dokumentatif) ──
comment on column sheets_settings.oauth_refresh_token is
  'Refresh token OAuth company account (Google login admin di dashboard). Rahasia — jangan pernah ekspos.';
comment on column sheets_settings.oauth_owner_email is
  'Email akun Google company yang terhubung (untuk tampilan status dashboard).';

-- ── 3. RLS: sudah terbuka dari 0020 (edge fn service_role). Tidak ada
--      perubahan kebijakan — GET status dashboard aman anonim (edge fn
--      hanya mengembalikan enabled + owner_email, tidak pernah token).
