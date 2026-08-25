-- ============================================================================
-- NUSA — Tabel Tutorial (v2.2.52)
-- ============================================================================
-- Kelola video tutorial untuk app NUSA. Video bisa ditargetkan ke beberapa
-- varian sekaligus (checkbox 8 varian) lewat kolom `variants` (array).
-- Admin kelola via nusa-online /dashboard → tab Tutorial; app membaca via
-- RLS public select per varian (tanpa perlu service role).
--
-- CARA JALANKAN: tempel script ini di Supabase Dashboard → SQL Editor, lalu Run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── 1. Tabel tutorials ──────────────────────────────────────────────────────
create table if not exists tutorials (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  yt_url        text not null,              -- link YouTube / Shorts
  thumbnail_url text,                        -- opsional: preview gambar admin + app
  description   text,                        -- optional ringkasan
  variants      text[] not null default '{}', -- ['nusa-kelontong','nusa-fnb',...]
  sort_order    int  not null default 0,     -- urutan tampil (kecil = dulu)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tutorials_variants on tutorials using gin (variants);

-- ── 2. RLS: app boleh baca semua (public preview), hanya service_role yg tulis ─
alter table tutorials enable row level security;

drop policy if exists tutorials_public_read on tutorials;
create policy tutorials_public_read
  on tutorials for select
  using (true);

drop policy if exists tutorials_service_role_all on tutorials;
create policy tutorials_service_role_all
  on tutorials for all
  to service_role
  using (true) with check (true);

-- ── 3. Bucket storage untuk thumbnail tutorial ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('tutorial-thumbnails', 'tutorial-thumbnails', true)
on conflict (id) do nothing;

-- izinkan upload thumbnail publik (tanpa auth) untuk keperluan admin tool
drop policy if exists tutorial_thumbs_public_insert on storage.objects;
create policy tutorial_thumbs_public_insert
  on storage.objects for insert
  with check (bucket_id = 'tutorial-thumbnails');

drop policy if exists tutorial_thumbs_public_select on storage.objects;
create policy tutorial_thumbs_public_select
  on storage.objects for select
  using (bucket_id = 'tutorial-thumbnails');

drop policy if exists tutorial_thumbs_public_update on storage.objects;
create policy tutorial_thumbs_public_update
  on storage.objects for update
  using (bucket_id = 'tutorial-thumbnails');