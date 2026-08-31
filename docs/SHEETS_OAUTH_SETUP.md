# Setup Google Sheets (Company API) — Login Google sekali

Koneksi spreadsheet NUSA pindah dari **service account** (403 `storageQuotaExceeded`,
kuota Drive SA = 0 di project `nusa-kasir-507208`) ke **OAuth akun Google company
NUSA**. Server pegang refresh token → buat & isi spreadsheet atas nama akun company.
App user **tidak perlu login Google** — alur app tidak berubah.

Ikuti urutan ini **sekali saja**. Setelah selesai, dashboard → tab **Spreadsheet** →
**Login Google** → paste kode → selesai.

---

## 1. Buat OAuth Client ID (Desktop app) — 2 menit

1. Buka Google Cloud Console: **https://console.cloud.google.com/apis/credentials**
   (pastikan project yang sama: `nusa-kasir-507208`)
2. Klik **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `NUSA Sheets Desktop` (bebas)
5. Klik **CREATE** → muncul dialog dengan **Client ID** + **Client Secret**
6. Salin **keduanya**, kirim ke aku (untuk di-set sebagai secret Supabase)

> Kalau Google minta konfigurasi consent screen dulu, ikuti langkah 2 dulu,
> baru ulangi dari sini.

## 2. OAuth consent screen — 2 menit

1. Buka: **https://console.cloud.google.com/apis/credentials/consent**
2. User type: **External** → Create
3. Isi App name (mis. `NUSA Kasir`), User support email, Developer email
   (email Google company NUSA) → Save
4. Di menu **Audience** / **Test users**: tambahkan email admin
   (mis. `nusabyhalugoodsindonesia@gmail.com`) — wajib, kalau tidak login Google
   ditolak saat masih status Testing
5. Di menu **Scopes** (jika diminta): tambahkan scope
   **`https://www.googleapis.com/auth/drive.file`**
6. Status boleh tetap **Testing** (cukup test user-nya) — tidak wajib Publish

## 3. Jalankan migration SQL — 1 menit

Buka **https://supabase.com/dashboard/project/sakeuhcbcnueplzlkltm/sql/new** →
tempel isi `supabase/migrations/0021_sheets_oauth.sql` → **Run**.

Isinya cuma nambah 2 kolom di `sheets_settings`:

```sql
alter table sheets_settings
  add column if not exists oauth_refresh_token text,
  add column if not exists oauth_owner_email text;
```

## 4. Set secret Supabase (dilakukan aku setelah kamu kasih Client ID/Secret)

```
GOOGLE_OAUTH_CLIENT_ID=<Client ID>
GOOGLE_OAUTH_CLIENT_SECRET=<Client Secret>
```

## 5. Deploy edge function (dilakukan aku)

```
supabase functions deploy sheets-admin --project-ref sakeuhcbcnueplzlkltm
```

## 6. Login Google di dashboard — 1 menit

1. Buka dashboard NUSA → tab **Spreadsheet**
2. Klik **Login Google** → tab baru ke halaman izin Google
3. Pilih **akun company NUSA** → izinkan
4. Browser diarahkan ke `http://127.0.0.1:43210` → koneksi gagal/tidak bisa dibuka
   (**itu NORMAL** — tidak ada server lokal). Salin **kode** dari address bar
   (mulai `4/0…` atau `4%2F0…`) → tempel di kotak dashboard → **Hubungkan Google**
5. Klik **Test Koneksi** → harusnya ✅ + link spreadsheet uji

> Redirect memakai **loopback** `http://127.0.0.1:43210` karena OOB paste-code
> (`urn:ietf:wg:oauth:2.0:oob`) sudah di-deprecate Google untuk client baru.
> Loopback tidak perlu didaftarkan di Google Console.

---

## Troubleshooting

| Gejala | Penyebab | Fix |
|---|---|---|
| `Tidak ada refresh_token` | Consent screen masih testing & email belum jadi test user | Tambahkan email admin sebagai **Test user** (langkah 2.4), pastikan `prompt=consent` |
| `invalid_client` | Client ID/Secret salah ketik atau beda project | Cek ulang di Credentials |
| `access_denied` | Scope belum ditambahkan di consent screen | Tambahkan `drive.file` scope |
| `The caller does not have permission` | Koneksi belum aktif / token expired | Login Google ulang (refresh token bisa dicabut user di myaccount) |
