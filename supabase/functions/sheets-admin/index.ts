// ============================================================================
// NUSA KASIR — Google Sheets Terpusat (Company API, OAuth Company Account)
// ============================================================================
// Edge function yang menghubungkan app NUSA Kasir + dashboard admin ke
// Google Sheets atas nama COMPANY ACCOUNT (akun Google pemilik NUSA, bukan
// service account, bukan akun per-user).
//
// Kredensial (OAuth refresh token) disimpan di tabel `sheets_settings`
// (diisi admin via dashboard: login Google sekali → refresh token tersimpan).
// App tidak perlu login Google lagi — cukup kirim `user_id` (canonical UID)
// + rows + request JSON, server yang menulis spreadsheet atas nama company.
//
// SETUP SUPABASE DASHBOARD (secret, wajib):
//   NUSA_ADMIN_KEY = 280303   (sama dengan edge fn admin lain)
//   GOOGLE_OAUTH_CLIENT_ID     = Client ID OAuth (Google Cloud)
//   GOOGLE_OAUTH_CLIENT_SECRET = Client Secret OAuth
//
// ACTIONS:
//   Admin (header `x-admin-key`):
//     oauth_status            {}                → info akun Google terhubung (email) + enabled
//     oauth_consent_url       {}                → URL consent Google (paste-code flow) untuk dashboard
//     oauth_callback          {code}            → tukar OAuth code → refresh token → simpan (AKUN UTAMA)
//     oauth_callback_account  {code, label?}    → tukar OAuth code → akun TAMBAHAN (tabel sheets_accounts)
//     test_credential         {}                → buat spreadsheet uji, buktikan token jalan
//     list_users              {}                → seluruh sheets_registry + link + status
//     list_accounts           {}                → daftar akun Google + jumlah user per akun
//     revoke_account          {account_id}      → nonaktifkan akun tambahan (tidak menerima user baru)
//     archive_month           {user_id, bulan}  → arsip semua tab spreadsheet user ke sheets_archive
//                                               (idempotent: upsert unik per user+bulan+tab, lalu kosongkan
//                                               tab di sheet supaya cloud panas tetap ramping)
//     list_archives           {user_id?}        → daftar arsip bulanan (dashboard + app)
//   User app (anon, identitas di body):
//     get_link                {user_id}               → spreadsheet_url yang sudah ada (404 kalau belum)
//     create_spreadsheet      {user_id, email, store_name, variant}
//                                                     → buat spreadsheet baru + share ke email user
//                                                       (auto-select akun Google paling longgar)
//     write                   {user_id, spreadsheet_id, tab, values[], requests[]}
//                                                     → tulis data + format (validasi kepemilikan)
//     append                  {user_id, spreadsheet_id, tab, values[], key_column_index?}
//                                                     → live sync append-only (dedup by kolom kunci,
//                                                       idempotent — v2.2.57+122)
//     get_archives            {user_id, bulan?}       → data bulan lama dari arsip Supabase (cold tier)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADMIN_KEY, isAdmin, serviceClient, archiveUserMonth } from "./shared.ts";

// ─── CORS ────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OAUTH_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const OAUTH_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Google OAuth (company account) auth ─────────────────────────────────
// Refresh token dari login admin disimpan di `sheets_settings.oauth_refresh_token`.
// Setiap panggilan: tukar refresh token → access token (drive.file scope).
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file";
// Redirect loopback, bukan urn:ietf:wg:oauth:2.0:oob — OOB sudah di-deprecate
// Google untuk client baru (2022). Browser diarahkan ke http://127.0.0.1:43210
// (koneksi ditolak karena tidak ada server lokal — NORMAL), tapi kode auth ada
// di address bar → user salin → paste di dashboard. Loopback tidak perlu
// didaftarkan di Google Console.
const OAUTH_REDIRECT_URI = "http://127.0.0.1:43210";

/** Baca refresh token + email owner dari sheets_settings. */
async function getOauthState(supabase: any): Promise<{
  refreshToken: string;
  ownerEmail: string;
  enabled: boolean;
}> {
  const { data, error } = await supabase
    .from("sheets_settings")
    .select("oauth_refresh_token, oauth_owner_email, enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Gagal baca sheets_settings: ${error.message}`);
  const enabled = data?.enabled === true;
  const refreshToken = data?.oauth_refresh_token ?? "";
  const ownerEmail = data?.oauth_owner_email ?? "";
  return { refreshToken, ownerEmail, enabled };
}

/** Tukar refresh token → access token (drive.file). */
async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const token = data["access_token"] as string | undefined;
  if (!token) throw new Error("Token refresh gagal — tidak ada access_token.");
  return token;
}

/** Helper utama: ambil access token OAuth dari state tersimpan. */
async function requireAccessToken(supabase: any): Promise<{ token: string; ownerEmail: string }> {
  const { refreshToken, ownerEmail, enabled } = await getOauthState(supabase);
  if (!enabled || !refreshToken) {
    throw new Error("Spreadsheet belum terhubung Google — login Google dulu di dashboard.");
  }
  return { token: await getAccessToken(refreshToken), ownerEmail };
}

// ─── Multi-akun Google (sheets_accounts) ─────────────────────────────────
// 1 akun Google company cover ±50 user (kuota Drive 15GB + ±60 req/min).
// Pas penuh → admin tambah akun baru di dashboard; edge fn auto-select akun
// paling longgar saat create spreadsheet. sheets_settings (id=1) tetap jadi
// akun utama / fallback.

const SHEETS_TABS = [
  "Laporan", "Produk", "Transaksi", "Stok", "Keuangan",
  "Karyawan", "Pelanggan", "Supplier", "Promo", "Presensi",
];

/** Token + email akun tertentu dari sheets_accounts (atau akun utama bila null). */
async function tokenForAccount(
  supabase: any,
  accountId: string | null,
): Promise<{ token: string; ownerEmail: string }> {
  if (!accountId) return requireAccessToken(supabase);
  const { data, error } = await supabase
    .from("sheets_accounts")
    .select("id, email, oauth_refresh_token, enabled")
    .eq("id", accountId)
    .maybeSingle();
  if (error || !data || !data.enabled || !data.oauth_refresh_token) {
    // Akun hilang/nonaktif (mis. di-revoke) → fallback ke akun utama.
    console.warn(`[sheets-admin] akun ${accountId} tidak tersedia — fallback akun utama`);
    return requireAccessToken(supabase);
  }
  return { token: await getAccessToken(data.oauth_refresh_token), ownerEmail: data.email };
}

/** Auto-select: akun tambahan enabled dengan user paling SEDIKIT (paling longgar). */
async function pickLeastLoadedAccount(supabase: any): Promise<string | null> {
  const { data: accounts, error } = await supabase
    .from("sheets_accounts")
    .select("id, max_users")
    .eq("enabled", true);
  if (error || !accounts || accounts.length === 0) return null;
  const { data: regs } = await supabase
    .from("sheets_registry")
    .select("account_id");
  const filled = new Map<string, number>();
  (regs ?? []).forEach((r: any) => {
    if (r?.account_id) filled.set(r.account_id, (filled.get(r.account_id) ?? 0) + 1);
  });
  let best: string | null = null;
  let bestRoom = -1;
  for (const a of accounts) {
    const room = (a.max_users ?? 50) - (filled.get(a.id) ?? 0);
    if (room > bestRoom) { bestRoom = room; best = a.id; }
  }
  return bestRoom > 0 ? best : null;
}
// ─── Google Sheets REST helpers (fetch langsung, tanpa SDK) ──────────────
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

async function googleFetch(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API (${res.status}): ${errText.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function sheetsCreate(
  token: string,
  title: string,
  tabs: string[],
): Promise<{ spreadsheetId: string; url: string }> {
  const body: any = {
    properties: { title },
    sheets: tabs.map((t) => ({ properties: { title: t } })),
  };
  const data = await googleFetch(token, SHEETS_API, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    spreadsheetId: data.spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

async function sheetsShare(
  token: string,
  spreadsheetId: string,
  email: string,
): Promise<void> {
  if (!email) return;
  // Drive API: share ke email user (writer) supaya muncul di Drive mereka.
  // Best-effort — gagal tidak menggagalkan create.
  try {
    await googleFetch(
      token,
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
      {
        method: "POST",
        body: JSON.stringify({
          role: "writer",
          type: "user",
          emailAddress: email,
        }),
      },
    );
  } catch (e) {
    console.error(`[sheets-admin] share ke ${email} gagal (dilewati): ${e}`);
  }
}

// ─── Resolve sheetId asli Google (Bug fix "no sheet with id: 0") ─────────
// Spreadsheet dibuat via API dengan daftar sheet → Google memberi sheetId
// RANDOM (tidak dijamin 0,1,2…). App mengirim request format dengan sheetId =
// INDEX tab (0-9). Server resolve dari `spreadsheets.get` lalu terjemahkan
// SEMUA request batchUpdate sebelum diteruskan ke Google API.

/** Baca sheetId asli semua sheet: map title→sheetId + index→sheetId. */
async function resolveSheetIds(
  token: string,
  spreadsheetId: string,
): Promise<{ byTitle: Map<string, number>; byIndex: Map<number, number> }> {
  const data = await googleFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
  );
  const byTitle = new Map<string, number>();
  const byIndex = new Map<number, number>();
  const sheets: any[] = data?.sheets ?? [];
  sheets.forEach((s: any, idx: number) => {
    const props = s?.properties;
    if (props && typeof props.sheetId === "number") {
      byIndex.set(idx, props.sheetId);
      if (props.title) byTitle.set(props.title, props.sheetId);
    }
  });
  return { byTitle, byIndex };
}

/** Terjemahkan sheetId INDEX (0-9) / title → sheetId asli Google, rekursif. */
function translateSheetIds(
  requests: any[],
  byTitle: Map<string, number>,
  byIndex: Map<number, number>,
): any[] {
  const resolve = (v: any, title?: string): any => {
    if (typeof v !== "number") return v;
    // Kalau request menyertakan title → resolve by title dulu (lebih tepat
    // walau tab sudah dipindah user).
    if (title && byTitle.has(title)) return byTitle.get(title);
    const byIdx = byIndex.get(v);
    return byIdx !== undefined ? byIdx : v; // tak dikenal → biarkan (aman)
  };
  const walk = (node: any): any => {
    if (node === null || typeof node !== "object") return node;
    const title = (node?.properties && typeof node.properties.title === "string")
      ? node.properties.title
      : undefined;
    if (Array.isArray(node)) return node.map((n) => walk(n));
    const out: any = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "sheetId") {
        out[key] = resolve(value, title);
      } else if (value && typeof value === "object") {
        out[key] = walk(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  };
  return requests.map((r) => walk(r));
}

async function sheetsWrite(
  token: string,
  spreadsheetId: string,
  tab: string,
  values: any[][],
  requests: any[],
): Promise<void> {
  // Tulis data (USER_ENTERED supaya angka/rupiah diformat Google).
  await googleFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab + "!A1")}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values }),
    },
  );
  // Teruskan request format JSON (template yang dikirim app) — TAPI sheetId
  // index (0-9) diterjemahkan ke sheetId asli Google dulu (Bug fix di atas).
  if (Array.isArray(requests) && requests.length > 0) {
    const { byTitle, byIndex } = await resolveSheetIds(token, spreadsheetId);
    const translated = translateSheetIds(requests, byTitle, byIndex);
    await googleFetch(token, `${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: translated }),
    });
  }
}

/**
 * Append baris baru ke tab (live sync, v2.2.57+122). IDEMPOTEN: baca kolom
 * kunci existing (default kolom A), buang baris yang kuncinya sudah ada,
 * lalu values:append sisanya. App TIDAK perlu marker lokal — dedup by key
 * membuat retry / 2 device / flush ganda tetap aman. Baris header dikirim
 * app sebagai baris pertama values: jika header sudah ada di kolom kunci,
 * baris header otomatis tersaring; jika tab masih kosong, header ikut
 * ter-append. (Anti lost-update: append-only, tidak pernah menimpa.)
 */
async function sheetsAppend(
  token: string,
  spreadsheetId: string,
  tab: string,
  values: any[][],
  keyColumnIndex = 0,
): Promise<{ appended: number }> {
  if (!Array.isArray(values) || values.length === 0) return { appended: 0 };

  // Baca kolom kunci existing (COLUMNS dimension → array[0] = kolom A).
  let existingKeys = new Set<string>();
  try {
    const col = await googleFetch(
      token,
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab + "!A:AZ")}?majorDimension=COLUMNS`,
    );
    const columns: any[][] = col?.values ?? [];
    const keyCol = columns[keyColumnIndex] ?? [];
    existingKeys = new Set(keyCol.map((v: any) => String(v)));
  } catch {
    // Tab belum ada isinya → Google balas kosong → semua baris dianggap baru.
  }

  const fresh = values.filter((r) => {
    const key = String(r[keyColumnIndex] ?? "");
    return key === "" ? true : !existingKeys.has(key);
  });
  if (fresh.length === 0) return { appended: 0 };

  await googleFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab + "!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: fresh }) },
  );
  return { appended: fresh.length };
}

// ─── Supabase helpers ── (di shared.ts, dipakai bareng sheets-archive-cron)

// ─── Handlers ────────────────────────────────────────────────────────────

async function handleOAuthStatus(supabase: any): Promise<Response> {
  const { refreshToken, ownerEmail, enabled } = await getOauthState(supabase);
  return json({
    enabled: enabled && !!refreshToken,
    owner_email: ownerEmail || null,
    has_credential: !!refreshToken,
  });
}

/** Bangun URL consent Google (loopback paste-code flow, drive.file, offline). */
function buildConsentUrl(): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: OAUTH_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function handleOAuthConsentUrl(): Promise<Response> {
  if (!OAUTH_CLIENT_ID) {
    return json({ error: "GOOGLE_OAUTH_CLIENT_ID belum di-set di Supabase." }, 500);
  }
  return json({ url: buildConsentUrl() });
}

async function handleOAuthCallback(supabase: any, body: any): Promise<Response> {
  let code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return json({ error: "Kode OAuth wajib diisi." }, 400);
  // Kode dari address bar bisa ter-encode (4%2F0…) atau sudah di-decode
  // (4/0…) — normalisasi biar keduanya lolos saat token exchange.
  try {
    code = decodeURIComponent(code);
  } catch {
    // code tidak punya sequence encode — biarkan apa adanya.
  }
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    return json({ error: "GOOGLE_OAUTH_CLIENT_ID / SECRET belum di-set di Supabase." }, 500);
  }

  // Tukar code → token (refresh_token + access_token + email).
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tukar kode gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const refreshToken = data["refresh_token"] as string | undefined;
  const accessToken = data["access_token"] as string | undefined;
  if (!refreshToken) {
    throw new Error(
      "Tidak ada refresh_token. Pastikan consent screen meminta offline access (access_type=offline) dan user bukan test user yang sudah consent.",
    );
  }

  // Ambil email owner dari access token (userinfo).
  let ownerEmail = "";
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ui.ok) {
      const u = await ui.json();
      ownerEmail = u.email ?? "";
    }
  } catch {
    ownerEmail = "";
  }

  await supabase.from("sheets_settings").upsert(
    {
      id: 1,
      oauth_refresh_token: refreshToken,
      oauth_owner_email: ownerEmail,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return json({
    ok: true,
    message: `Google terhubung${ownerEmail ? ` sebagai ${ownerEmail}` : ""}.`,
    owner_email: ownerEmail,
  });
}

async function handleTestCredential(supabase: any): Promise<Response> {
  const { token } = await requireAccessToken(supabase);
  const start = Date.now();
  const { url } = await sheetsCreate(token, "NUSA Test Koneksi", ["Test"]);
  const latency = Date.now() - start;
  return json({
    ok: true,
    message: "Koneksi berhasil! Spreadsheet uji dibuat.",
    url,
    latency_ms: latency,
  });
}

async function handleListUsers(supabase: any): Promise<Response> {
  const { data, error } = await supabase
    .from("sheets_registry")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Gagal baca sheets_registry: ${error.message}`);
  return json({ users: data });
}

// ─── Multi-akun: daftar / tambah / revoke (admin) ────────────────────────

async function handleListAccounts(supabase: any): Promise<Response> {
  const { data: accounts, error } = await supabase
    .from("sheets_accounts")
    .select("id, email, enabled, max_users, label, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Gagal baca sheets_accounts: ${error.message}`);
  const { data: regs } = await supabase
    .from("sheets_registry")
    .select("account_id");
  const filled = new Map<string, number>();
  (regs ?? []).forEach((r: any) => {
    if (r?.account_id) filled.set(r.account_id, (filled.get(r.account_id) ?? 0) + 1);
  });
  // Akun utama (sheets_settings) juga ditampilkan bila sudah terhubung.
  const main = await getOauthState(supabase);
  return json({
    main_account: {
      email: main.ownerEmail || null,
      enabled: main.enabled && !!main.refreshToken,
      users: (regs ?? []).filter((r: any) => !r?.account_id).length,
      max_users: 50,
    },
    accounts: (accounts ?? []).map((a: any) => ({
      ...a,
      users: filled.get(a.id) ?? 0,
    })),
  });
}

/** OAuth code → akun TAMBAHAN baru (sheets_accounts), bukan akun utama. */
async function handleOAuthCallbackAccount(supabase: any, body: any): Promise<Response> {
  let code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return json({ error: "Kode OAuth wajib diisi." }, 400);
  try { code = decodeURIComponent(code); } catch { /* biarkan apa adanya */ }
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    return json({ error: "GOOGLE_OAUTH_CLIENT_ID / SECRET belum di-set di Supabase." }, 500);
  }
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tukar kode gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const refreshToken = data["refresh_token"] as string | undefined;
  const accessToken = data["access_token"] as string | undefined;
  if (!refreshToken) {
    throw new Error("Tidak ada refresh_token (access_type=offline wajib; coba akun Google lain).");
  }
  let email = "";
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ui.ok) email = (await ui.json()).email ?? "";
  } catch { email = ""; }
  if (!email) return json({ error: "Gagal baca email akun Google dari token." }, 400);

  // Relink akun sama = update (unique di expression index lower(email), jadi
  // upsert PostgREST tidak bisa dipakai — lakukan manual).
  const { data: existing } = await supabase
    .from("sheets_accounts")
    .select("id")
    .ilike("email", email)
    .limit(1);
  if (existing && existing.length > 0) {
    await supabase
      .from("sheets_accounts")
      .update({
        oauth_refresh_token: refreshToken,
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
  } else {
    await supabase.from("sheets_accounts").insert({
      email,
      oauth_refresh_token: refreshToken,
      enabled: true,
      label: typeof body.label === "string" ? body.label : null,
    });
  }

  return json({ ok: true, message: `Akun ${email} terhubung.`, email });
}

async function handleRevokeAccount(supabase: any, body: any): Promise<Response> {
  const accountId = body.account_id;
  if (!accountId) return json({ error: "account_id wajib diisi." }, 400);
  // Nonaktifkan (bukan delete) — token di-nol-kan supaya tidak menggantung.
  const { error } = await supabase
    .from("sheets_accounts")
    .update({
      enabled: false,
      oauth_refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);
  if (error) throw new Error(`Gagal revoke akun: ${error.message}`);
  return json({ ok: true, message: "Akun dinonaktifkan. User terikat tetap terbaca dari arsip; user baru diarahkan ke akun lain." });
}

// ─── Arsip bulanan (cold storage) ────────────────────────────────────────

/**
 * Arsip SEMUA tab spreadsheet user ke sheets_archive (Supabase), lalu
 * kosongkan tab di spreadsheet (cloud panas tetap ramping).
 * Logika di shared.ts → dipakai juga oleh cron otomatis (satu sumber).
 */
async function handleArchiveMonth(supabase: any, body: any): Promise<Response> {
  const { user_id, bulan } = body;
  if (!user_id || !bulan || !/^\d{4}-\d{2}$/.test(bulan)) {
    return json({ error: "user_id dan bulan (format YYYY-MM) wajib diisi." }, 400);
  }
  const { tabs } = await archiveUserMonth(supabase, user_id, bulan);
  const total = Object.values(tabs).reduce((a, b) => a + b, 0);
  return json({
    ok: true,
    message: `Arsip ${bulan} tersimpan (${total} baris), sheet dikosongkan.`,
    tabs,
  });
}

async function handleListArchives(supabase: any, body: any): Promise<Response> {
  let q = supabase
    .from("sheets_archive")
    .select("user_id, bulan, tab, row_count, archived_at")
    .order("bulan", { ascending: false })
    .limit(500);
  if (body.user_id) q = q.eq("user_id", body.user_id);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal baca sheets_archive: ${error.message}`);
  return json({ archives: data ?? [] });
}

/** Data arsip untuk APP: bulan lama dibaca dari Supabase (cold tier). */
async function handleGetArchives(supabase: any, body: any): Promise<Response> {
  const { user_id, bulan, tab } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  let q = supabase
    .from("sheets_archive")
    .select("bulan, tab, rows, row_count")
    .eq("user_id", user_id);
  if (bulan) q = q.eq("bulan", bulan);
  if (tab) q = q.eq("tab", tab);
  const { data, error } = await q.limit(20);
  if (error) throw new Error(`Gagal baca arsip: ${error.message}`);
  return json({ archives: data ?? [] });
}

// ─── User app actions ────────────────────────────────────────────────────

async function handleGetLink(supabase: any, body: any): Promise<Response> {
  const userId = body.user_id;
  if (!userId) return json({ error: "user_id wajib diisi." }, 400);
  const { data } = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id, spreadsheet_url, status, error")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.spreadsheet_id || !data.spreadsheet_url) {
    return json({ error: "Belum ada spreadsheet untuk user ini." }, 404);
  }
  return json({
    spreadsheet_id: data.spreadsheet_id,
    spreadsheet_url: data.spreadsheet_url,
    status: data.status,
    error: data.error,
  });
}

async function handleCreateSpreadsheet(supabase: any, body: any): Promise<Response> {
  const { user_id, email, store_name, variant } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);

  // Link kontinu: kalau sudah pernah dibuat, balikin yang lama.
  const existing = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id, spreadsheet_url, status")
    .eq("user_id", user_id)
    .maybeSingle();
  if (existing?.data?.spreadsheet_id && existing?.data?.spreadsheet_url) {
    return json({
      spreadsheet_id: existing.data.spreadsheet_id,
      spreadsheet_url: existing.data.spreadsheet_url,
      created: false,
      status: existing.data.status,
    });
  }

  // Auto-select akun Google paling longgar (multi-akun); null = akun utama.
  const accountId = await pickLeastLoadedAccount(supabase);
  const { token } = await tokenForAccount(supabase, accountId);
  const { spreadsheetId, url } = await sheetsCreate(
    token,
    store_name ? `Laporan NUSA — ${store_name}` : "Laporan NUSA",
    SHEETS_TABS,
  );
  await sheetsShare(token, spreadsheetId, email || "");

  await supabase.from("sheets_registry").upsert(
    {
      user_id,
      email: email || "",
      store_name: store_name || "",
      variant: variant || "",
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: url,
      account_id: accountId,
      status: "ready",
      error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return json({ spreadsheet_id: spreadsheetId, spreadsheet_url: url, created: true, status: "ready" });
}

async function handleWrite(supabase: any, body: any): Promise<Response> {
  const { user_id, spreadsheet_id, tab, values, requests } = body;
  if (!user_id || !spreadsheet_id || !tab) {
    return json({ error: "user_id, spreadsheet_id, tab wajib diisi." }, 400);
  }

  // Validasi kepemilikan: registry[user_id].spreadsheet_id == spreadsheet_id
  // (anti tulis spreadsheet orang lain) + tahu spreadsheet itu milik akun mana.
  const { data } = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id, status, error, account_id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (!data || data.spreadsheet_id !== spreadsheet_id) {
    return json({ error: "Spreadsheet bukan milik user ini." }, 403);
  }

  const { token } = await tokenForAccount(supabase, data.account_id ?? null);
  await sheetsWrite(token, spreadsheet_id, tab, Array.isArray(values) ? values : [], Array.isArray(requests) ? requests : []);
  await supabase.from("sheets_registry").update({
    status: "ready",
    error: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user_id);

  return json({ ok: true });
}

/// Live sync append (v2.2.57+122) — kepemilikan divalidasi sama seperti
/// `write`, tapi baris di-APPEND dengan dedup by kolom kunci (lihat
/// [sheetsAppend]); tidak pernah menimpa baris lama.
async function handleAppend(supabase: any, body: any): Promise<Response> {
  const { user_id, spreadsheet_id, tab, values, key_column_index } = body;
  if (!user_id || !spreadsheet_id || !tab) {
    return json({ error: "user_id, spreadsheet_id, tab wajib diisi." }, 400);
  }

  const { data } = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id, status, error, account_id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (!data || data.spreadsheet_id !== spreadsheet_id) {
    return json({ error: "Spreadsheet bukan milik user ini." }, 403);
  }

  const { token } = await tokenForAccount(supabase, data.account_id ?? null);
  const { appended } = await sheetsAppend(
    token,
    spreadsheet_id,
    tab,
    Array.isArray(values) ? values : [],
    typeof key_column_index === "number" ? key_column_index : 0,
  );
  await supabase.from("sheets_registry").update({
    status: "ready",
    error: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user_id);

  return json({ ok: true, appended });
}

// ─── Router ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = serviceClient();

    // GET → baca status kredensial (dipakai dashboard, aman anonim: tidak
    // pernah mengekspos refresh token — cuma enabled + owner email).
    if (req.method === "GET") {
      const { data } = await supabase
        .from("sheets_settings")
        .select("enabled, oauth_owner_email")
        .eq("id", 1)
        .maybeSingle();
      return json({
        enabled: data?.enabled === true && !!data?.oauth_owner_email,
        owner_email: data?.oauth_owner_email ?? null,
      });
    }

    const body = await req.json();
    const action = body.action ?? "";
    let result: Response;

    switch (action) {
      // ── Admin ──
      case "oauth_status":
      case "oauth_callback":
      case "oauth_callback_account":
      case "oauth_consent_url":
      case "test_credential":
      case "list_users":
      case "list_accounts":
      case "revoke_account":
      case "archive_month":
      case "list_archives":
        if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);
        result =
          action === "oauth_status"
            ? await handleOAuthStatus(supabase)
            : action === "oauth_callback"
            ? await handleOAuthCallback(supabase, body)
            : action === "oauth_callback_account"
            ? await handleOAuthCallbackAccount(supabase, body)
            : action === "oauth_consent_url"
            ? await handleOAuthConsentUrl()
            : action === "test_credential"
            ? await handleTestCredential(supabase)
            : action === "list_users"
            ? await handleListUsers(supabase)
            : action === "list_accounts"
            ? await handleListAccounts(supabase)
            : action === "revoke_account"
            ? await handleRevokeAccount(supabase, body)
            : action === "archive_month"
            ? await handleArchiveMonth(supabase, body)
            : await handleListArchives(supabase, body);
        break;

      // ── User app ──
      case "get_link":
      case "create_spreadsheet":
      case "write":
      case "append":
      case "get_archives":
        result =
          action === "get_link"
            ? await handleGetLink(supabase, body)
            : action === "create_spreadsheet"
            ? await handleCreateSpreadsheet(supabase, body)
            : action === "get_archives"
            ? await handleGetArchives(supabase, body)
            : action === "append"
            ? await handleAppend(supabase, body)
            : await handleWrite(supabase, body);
        break;

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
    return result;
  } catch (e: any) {
    console.error(`[sheets-admin] ${e?.stack ?? e}`);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

// isAdmin: di shared.ts (dipakai bareng sheets-archive-cron).
