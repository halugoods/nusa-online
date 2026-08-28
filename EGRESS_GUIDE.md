# Panduan Manual: Cache Egress Supabase (v2.2.57+113)

## Kenapa egress "penuh" & reset harian?
- **Cached Egress reset tiap 00:00 UTC** — chart harian selalu mulai dari 0.
- "Tiba-tiba penuh" = satu hari pemakaian tinggi (download/upload gambar,
  auto-sync backup, atau objek yang tidak ter-cache CDN).
- Objek `nusa-images` SUDAH `public, max-age=3600` (cache CDN 1 jam) — jadi
  gambar produk bukan sumber terbesar; yang perlu di-set adalah thumbnail.

## 1. Set cache header thumbnail lama (manual, sekali)
Thumbnail lama (`tutorial-thumbnails`) masih `no-cache` → egress tiap render.
Cara set dari dashboard:
1. Buka **Supabase Dashboard** → project `sakeuhcbcnueplzlkltm`.
2. **Storage** → pilih bucket **tutorial-thumbnails**.
3. Klik file thumbnail (`tut-*.png`).
4. Di panel kanan, cari **"Cache Control"** → ubah ke:
   ```
   public, max-age=31536000, immutable
   ```
5. Save. (Upload thumbnail berikutnya dari dashboard SUDAH otomatis pakai
   header ini — patch di `tutorial-manager.ts`.)

> Opsional: untuk objek `nusa-images` lama yang ingin di-extend dari 1 jam ke
> 1 tahun, lakukan hal yang sama di bucket `nusa-images` per file.

## 2. Cara baca metrik egress
1. **Supabase Dashboard** → **Reports** (menu kiri, bawah) → **Egress**.
2. Pilih rentang yang spike → klik **"Cached"** tab → lihat **Top files**.
3. File yang paling sering muncul = sumber byte terbesar. Biasanya:
   - `nusa-images/...` (gambar produk/QRIS/karyawan — sudah ter-cache 1 jam)
   - `tutorial-thumbnails/...` (perlu header di atas)
   - `nusa-sounds/...` (kosong — bukan sumber)

## 3. Yang sudah diperbaiki kode (v2.2.57+113)
- App: `syncAll()`/`uploadAllLocal()` tidak probe-download berulang per start.
- nusa-online: `fetchManifest()` tidak `no-store` lagi (cache CDN/browser aman).
- nusa-online: upload thumbnail otomatis `Cache-Control` 1 tahun.

## 4. Cara meng-upload ulang thumbnail lama (kalau mau yang paling gampang)
Kalau tidak mau set manual per file, cukup **re-upload thumbnail lewat
dashboard** (fitur Tutorial → ganti thumbnail) — file baru otomatis dapat
header cache 1 tahun dari patch.
