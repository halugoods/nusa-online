-- ============================================================================
-- NUSA KASIR — Google Sheets Multi-Akun + Arsip Bulanan (cold storage)
-- ============================================================================
-- PIVOT hot/cold tiering (disetujui user 2026-08-31):
--   * Sheets = cloud PANAS realtime: 1 akun Google company cover max 50 user
--     (kuota Drive 15GB + ±60 req/min). Pas penuh → tambah akun baru untuk
--     user 51-100, dst. Semua akun dikelola di dashboard (tab "Cloud Google")
--     dengan OAuth paste-code PER AKUN (refresh token sendiri-sendiri).
--   * Supabase = arsip DINGIN: tiap 1 bulan pembukuan → data bulan itu
--     di-backup ke tabel arsip lalu DIHAPUS dari spreadsheet (sheet panas
--     tetap ramping → load cepat). Laporan bulan lama dibaca dari Supabase
--     (jarang diakses → egress near-zero → tanpa langganan, $0 budget).
--
-- Tabel baru:
--   * sheets_accounts   — daftar akun Google company (multi-akun). Baris
--                         pertama yang enabled = jalur utama; edge fn
--                         auto-select akun paling longgar (user/50).
--   * sheets_archive    — data bulanan terarsip per user (JSON per tab),
--                         key unik (user_id, bulan, tab) → idempotent:
--                         arsip jalan 2× TIDAK menduplikasi baris.
--
-- Back-compat: sheets_settings (id=1) TETAP dipakai sebagai akun utama
-- (fallback + status global `enabled`). sheets_accounts adalah lapisan
-- tambahan — tidak ada data lama yang dipindah/dihapus.
-- ============================================================================

-- ── 1. sheets_accounts: akun Google company (multi-akun, 50 user/akun) ──
create table if not exists sheets_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  oauth_refresh_token text,
  enabled boolean not null default true,
  -- Batas kapasitas per akun (Sheets API quota + Drive 15GB).
  max_users int not null default 50,
  -- Catatan bebas (mis. "akun kedua — cabang Jakarta").
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists sheets_accounts_email_key
  on sheets_accounts (lower(email));

-- ── 2. sheets_archive: cold storage bulanan (idempotent per baris) ──
create table if not exists sheets_archive (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Bulan pembukuan yang diarsipkan, format "YYYY-MM" (waktu toko, bukan UTC).
  bulan text not null,
  -- Nama tab spreadsheet sumber (Laporan / Transaksi / Stok / …).
  tab text not null,
  -- Isi baris-baris tab tsb (array of arrays, persis format values Sheets).
  rows jsonb not null default '[]'::jsonb,
  -- Jumlah baris (tanpa header) — untuk tampilan dashboard + audit.
  row_count int not null default 0,
  archived_at timestamptz not null default now(),
  -- Idempoten: arsip ulang bulan+tab yang sama menimpa (bukan dobel).
  unique (user_id, bulan, tab)
);
create index if not exists sheets_archive_user_idx on sheets_archive (user_id, bulan);

-- ── 3. sheets_registry + account_id (user terikat ke akun Google mana) ──
alter table sheets_registry
  add column if not exists account_id uuid;

-- ── 4. RLS: buka (edge fn memakai service_role; dashboard akses via edge fn
--         dengan x-admin-key, bukan langsung ke tabel) ──
alter table sheets_accounts enable row level security;
alter table sheets_archive enable row level security;

drop policy if exists "sheets_accounts_all" on sheets_accounts;
create policy "sheets_accounts_all" on sheets_accounts for all using (true) with check (true);

drop policy if exists "sheets_archive_all" on sheets_archive;
create policy "sheets_archive_all" on sheets_archive for all using (true) with check (true);
