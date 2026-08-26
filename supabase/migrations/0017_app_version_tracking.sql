-- 0017: App version tracking + force-update (v2.2.57)
-- Jalankan di Supabase SQL Editor.

-- Track versi app terakhir yang dipakai per lisensi (diisi oleh edge fn
-- `app_ping` setiap kali app start/resume).
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_app_version TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_app_build INTEGER;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Versi minimum per produk. Kalau build app < min_build → app menampilkan
-- popup update wajib (blocking) dengan tombol download via browser.
CREATE TABLE IF NOT EXISTS app_min_versions (
  product TEXT PRIMARY KEY,
  min_version TEXT NOT NULL DEFAULT '',
  min_build INTEGER NOT NULL DEFAULT 0,
  download_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
