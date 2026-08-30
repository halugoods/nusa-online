-- ============================================================================
-- NUSA KASIR — Google Sheets Terpusat (Company API): sheets_settings +
-- sheets_registry (Area Spreadsheet)
-- ============================================================================
-- Fitur spreadsheet dipindah dari Google OAuth per-user ke kredensial
-- company (service account) yang dikonfigurasi admin di dashboard
-- nusa-online. App cukup kirim rows + request JSON ke edge function
-- `sheets-admin`, server yang menulis ke Google Sheets atas nama service
-- account.
--
--   * sheets_settings — 1 baris global berisi service account JSON milik
--                       NUSA (client_email + private_key). Dikunci `id=1`.
--   * sheets_registry  — per user: spreadsheet yang sudah dibuat (link
--                       KONTINU — dibuat sekali, dipakai terus). Kolom
--                       spreadsheet_id/url ini yang diverifikasi edge fn
--                       saat `write` (anti tulis spreadsheet orang lain).
--
-- Identitas: canonical UID app (nusa_account_uid UUID ATAU nusa_google_user_id
-- 21-digit) dikirim di body request, jadi `user_id` dipilih edge function dari
-- body (bukan JWT). RLS dibuka karena edge function memakai service_role.
-- ============================================================================

-- ── 1. sheets_settings: kredensial service account NUSA (1 baris global) ──
create table if not exists sheets_settings (
  id int primary key default 1 check (id = 1),
  service_account_json text not null default '',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── 2. sheets_registry: spreadsheet per user (link kontinu) ──
create table if not exists sheets_registry (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  email text,
  store_name text,
  variant text,
  spreadsheet_id text,
  spreadsheet_url text,
  status text not null default 'pending' check (status in ('pending','ready','error')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sheets_registry_status_idx on sheets_registry (status);

-- ── 3. RLS: buka (edge function memakai service_role; identitas user_id
--         dipilih di edge function dari body request, bukan dari JWT) ──
alter table sheets_settings enable row level security;
alter table sheets_registry enable row level security;

drop policy if exists "sheets_settings_all" on sheets_settings;
create policy "sheets_settings_all" on sheets_settings for all using (true) with check (true);

drop policy if exists "sheets_registry_all" on sheets_registry;
create policy "sheets_registry_all" on sheets_registry for all using (true) with check (true);
