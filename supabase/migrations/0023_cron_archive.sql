-- ============================================================================
-- NUSA KASIR — Cron arsip bulanan otomatis (rotasi Sheets → Supabase)
-- ============================================================================
-- Jadwal: tanggal 2 tiap bulan, 18:00 UTC = 01:00 WIB (di luar jam sibuk).
-- Cron memanggil edge fn sheets-archive-cron (x-admin-key) yang:
--   1. Menentukan bulan pembukuan yang baru selesai (bulan lalu, WIB)
--   2. Loop semua user yang punya spreadsheet
--   3. Arsip semua tab ke sheets_archive (idempotent) lalu kosongkan sheet
--
-- Jalankan SEKALI di Supabase SQL Editor (butuh extension pg_cron + pg_net,
-- keduanya tersedia di Supabase — aktifkan di Database → Extensions bila
-- belum).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Hapus jadwal lama bila ada (idempotent — aman dijalankan ulang)
select cron.unschedule('nusa-sheets-archive')
where exists (select 1 from cron.job where jobname = 'nusa-sheets-archive');

select cron.schedule(
  'nusa-sheets-archive',
  '0 18 2 * *',
  $$
  select net.http_post(
    url := 'https://sakeuhcbcnueplzlkltm.supabase.co/functions/v1/sheets-archive-cron',
    headers := jsonb_build_object(
      'x-admin-key', '280303',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
