-- ============================================================================
-- NUSA KASIR — Cloud Google (Google Drive backup, hot tier) — 0024
-- ============================================================================
-- Arsitektur 2-cloud FINAL (disetujui user 2026-09-01):
--   * Spreadsheet (laporan user)  → Google Sheets, akun khusus sheets
--     (nusabyhalugoodsindonesia@gmail.com) — TIDAK ada hubungannya dengan
--     backup. Dikelola di tab "Google Sheets" (sheets_settings/sheets_accounts).
--   * Cloud Google (backup data)  → Google DRIVE via akun company TERPISAH
--     (user add sendiri akunnya di dashboard). Backup SQLite user yang
--     sekarang di bucket `nusa-backups` Supabase dimigrasi ke Drive;
--     Supabase TETAP menerima backup (dobel, fallback) — tidak ada yang
--     dihapus.
--
-- Tabel baru:
--   * drive_accounts  — akun Google khusus Cloud Google (multi-akun, max
--                       users/akun, refresh token sendiri-sendiri).
--   * drive_registry  — 1 baris per user+variant: file Drive tempat backup
--                       SQLite user disimpan (file_id + link + metadata).
--                       unique (user_id, variant) → idempotent.
-- ============================================================================

-- ── 1. drive_accounts: akun Google khusus Cloud Google (Drive) ──
create table if not exists drive_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  oauth_refresh_token text,
  enabled boolean not null default true,
  -- Batas user per akun (Drive 15GB; backup ±1-5MB/user/variant → longgar).
  max_users int not null default 50,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists drive_accounts_email_key
  on drive_accounts (lower(email));

-- ── 2. drive_registry: file Drive per user+variant (link kontinu) ──
create table if not exists drive_registry (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Varian app (product id, mis. kelontong/salon) — backup per varian,
  -- sama seperti path bucket {uid}/{productId}/.
  variant text not null default '',
  email text,
  -- Drive file id + link (file dibuat sekali, di-update terus = link kontinu).
  drive_file_id text,
  drive_link text,
  account_id uuid references drive_accounts(id),
  -- Metadata terakhir upload (untuk tampilan dashboard + audit).
  last_size_bytes bigint,
  last_uploaded_at timestamptz,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant)
);
create index if not exists drive_registry_user_idx on drive_registry (user_id);

-- ── 3. RLS: buka (edge fn service_role; dashboard via edge fn x-admin-key) ──
alter table drive_accounts enable row level security;
alter table drive_registry enable row level security;

drop policy if exists "drive_accounts_all" on drive_accounts;
create policy "drive_accounts_all" on drive_accounts for all using (true) with check (true);

drop policy if exists "drive_registry_all" on drive_registry;
create policy "drive_registry_all" on drive_registry for all using (true) with check (true);
