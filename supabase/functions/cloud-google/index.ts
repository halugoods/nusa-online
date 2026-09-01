// ============================================================================
// NUSA KASIR — Cloud Google (backup data user → Google Drive) v2.2.57+122
// ============================================================================
// Arsitektur 2-cloud FINAL (disetujui user 2026-09-01):
//   * Spreadsheet (laporan) → Google Sheets via `sheets-admin` — akun khusus
//     sheets, TIDAK berhubungan dengan backup.
//   * Cloud Google (backup) → Google DRIVE via edge fn INI — akun company
//     TERPISAH yang admin add sendiri (drive_accounts).
//
// Aliran data (aman dari body-limit edge fn — file tidak lewat HTTP body):
//   App upload backup SQLite (terenkripsi) ke Supabase Storage bucket
//   `nusa-backups` (jalur lama, TETAP JALAN = backup dobel) → app memanggil
//   action `sync_latest` → SERVER yang download terbaru dari bucket
//   (service_role, internal) dan upload ke Drive akun company.
//
// SETUP SUPABASE DASHBOARD (secret):
//   NUSA_ADMIN_KEY = 280303 (sama dengan edge fn admin lain)
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET (sama dengan sheets)
//
// ACTIONS:
//   Admin (x-admin-key):
//     consent_url     {}                     → URL consent Google (paste-code)
//     add_account     {code, label?}         → tukar code → refresh token → drive_accounts
//     list_accounts   {}                     → daftar akun Drive + user count
//     revoke_account  {account_id}           → nonaktifkan akun
//     list_registry   {}                     → drive_registry semua user
//     migrate_user    {user_id}              → copy backup bucket → Drive utk 1 user
//     migrate_all     {}                     → copy SEMUA user di bucket → Drive
//   User app (anon, identitas di body):
//     ensure          {user_id, variant}     → registry row (auto-bind akun longgar)
//     sync_latest     {user_id, variant}     → copy backup terbaru bucket → Drive
//     meta            {user_id, variant}     → timestamp+size backup di Drive (murah)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";
// Client KHUSUS Cloud Google (Web app milik akun backup — TERPISAH dari
// client Sheets). Kredensial sekali-set via `supabase secrets set`.
const OAUTH_CLIENT_ID = Deno.env.get("DRIVE_OAUTH_CLIENT_ID") ?? "";
const OAUTH_CLIENT_SECRET = Deno.env.get("DRIVE_OAUTH_CLIENT_SECRET") ?? "";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
// drive.file: app hanya melihat file yang dibuatnya sendiri (aman + cukup).
const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file";
// Redirect balik ke dashboard → user tinggal klik izinkan, TANPA copy-paste
// kode (client Web app: URI ini wajib terdaftar persis di Google Console).
const OAUTH_REDIRECT_URI = "https://nusa-online.vercel.app/drive-callback";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_BUCKET = "nusa-backups";
const BACKUP_FILENAME = "backup.sqlite.enc";
const DRIVE_FOLDER_NAME = "NUSA Backups";

function isAdmin(req: Request): boolean {
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-admin-key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
    },
  });
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function driveFetch(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive API (${res.status}): ${errText.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("json") ? res.json() : res.arrayBuffer();
}

async function getAccessTokenFromRefresh(refreshToken: string): Promise<string> {
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

/** Token dari akun registry tertentu (fallback: akun pertama yang aktif). */
async function tokenForRegistry(supabase: any, accountId: string | null): Promise<string> {
  if (accountId) {
    const { data } = await supabase
      .from("drive_accounts")
      .select("oauth_refresh_token, enabled")
      .eq("id", accountId)
      .maybeSingle();
    if (data?.enabled && data.oauth_refresh_token) {
      return getAccessTokenFromRefresh(data.oauth_refresh_token);
    }
  }
  const { data } = await supabase
    .from("drive_accounts")
    .select("id, oauth_refresh_token")
    .eq("enabled", true)
    .not("oauth_refresh_token", "is", null)
    .limit(1);
  if (data && data.length > 0) return getAccessTokenFromRefresh(data[0].oauth_refresh_token);
  throw new Error("Belum ada akun Google Drive terhubung — add akun dulu di dashboard (Cloud Google).");
}

/** Akun dengan slot paling longgar (max_users - terpakai terbesar). */
async function pickLeastLoadedAccount(supabase: any): Promise<string | null> {
  const { data: accounts } = await supabase
    .from("drive_accounts")
    .select("id, max_users")
    .eq("enabled", true);
  if (!accounts || accounts.length === 0) return null;
  const { count } = await supabase
    .from("drive_registry")
    .select("id", { count: "exact", head: true });
  // Semua user di satu registry global — akun tunggal dulu (pola 50/akun
  // menyusul saat admin add akun kedua; binding manual lewat migrate).
  const first = accounts[0];
  return (count ?? 0) < (first.max_users ?? 50) ? first.id : null;
}

/** Cari (atau buat sekali) folder "NUSA Backups" di Drive akun tsb. */
async function ensureFolder(token: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const found = await driveFetch(token, `${DRIVE_API}/files?q=${q}&fields=files(id)&pageSize=1`);
  const existing = found?.files?.[0]?.id;
  if (existing) return existing;
  const created = await driveFetch(token, `${DRIVE_API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  return created.id as string;
}

/**
 * Copy satu backup dari bucket → Drive (create/update file). IDEMPOTENT:
 * registry punya drive_file_id → selalu UPDATE file yang sama (link kontinu).
 */
async function copyBackupToDrive(
  supabase: any,
  token: string,
  folderId: string,
  userId: string,
  variant: string,
): Promise<{ fileId: string; size: number; action: string }> {
  const path = `${userId}/${variant}/${BACKUP_FILENAME}`;
  const { data: blob, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .download(path);
  if (error || !blob) {
    throw new Error(`Backup tidak ditemukan di bucket: ${path}`);
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length === 0) throw new Error(`Backup kosong: ${path}`);

  const fileName = `${userId}_${variant || "default"}.sqlite.enc`;

  const { data: reg } = await supabase
    .from("drive_registry")
    .select("id, drive_file_id")
    .eq("user_id", userId)
    .eq("variant", variant)
    .maybeSingle();

  let fileId = reg?.drive_file_id as string | undefined;
  let action = "created";
  if (fileId) {
    // Update media file yang sama (link kontinu, tidak menumpuk file).
    try {
      await driveFetch(
        token,
        `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/octet-stream" },
          body: bytes,
        },
      );
      action = "updated";
    } catch {
      // File hilang/dihapus di Drive → buat ulang.
      fileId = undefined;
    }
  }
  if (!fileId) {
    const boundary = "nusa-drive-" + Date.now();
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
      appProperties: { user_id: userId, variant },
    });
    const metaBytes = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    );
    const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(metaBytes.length + bytes.length + tail.length);
    body.set(metaBytes, 0);
    body.set(bytes, metaBytes.length);
    body.set(tail, metaBytes.length + bytes.length);
    const created = await driveFetch(
      token,
      `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    fileId = created.id as string;
  }

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    variant,
    drive_file_id: fileId,
    drive_link: `https://drive.google.com/file/d/${fileId}/view`,
    last_size_bytes: bytes.length,
    last_uploaded_at: now,
    status: "ready",
    error: null,
    updated_at: now,
  };
  if (reg?.id) {
    await supabase.from("drive_registry").update(row).eq("id", reg.id);
  } else {
    await supabase.from("drive_registry").upsert(row, { onConflict: "user_id,variant" });
  }
  return { fileId, size: bytes.length, action };
}

/** Copy backup TERBARU 1 user+variant (dipakai sync_latest & migrate). */
async function syncLatestFor(
  supabase: any,
  userId: string,
  variant: string,
): Promise<{ fileId: string; size: number }> {
  const { data: reg } = await supabase
    .from("drive_registry")
    .select("id, account_id")
    .eq("user_id", userId)
    .eq("variant", variant)
    .maybeSingle();
  if (!reg) throw new Error("User belum terdaftar di drive_registry (panggil ensure dulu).");
  const token = await tokenForRegistry(supabase, reg.account_id ?? null);
  const folderId = await ensureFolder(token);
  return copyBackupToDrive(supabase, token, folderId, userId, variant);
}

// ─── Handlers ────────────────────────────────────────────────────────────

function handleConsentUrl(): Response {
  if (!OAUTH_CLIENT_ID) {
    return json({ error: "GOOGLE_OAUTH_CLIENT_ID belum di-set di Supabase." }, 500);
  }
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: OAUTH_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}

async function handleAddAccount(supabase: any, body: any): Promise<Response> {
  let code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return json({ error: "Kode OAuth wajib diisi." }, 400);
  try {
    code = decodeURIComponent(code);
  } catch {
    // code tanpa encode — biarkan.
  }
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    return json({ error: "DRIVE_OAUTH_CLIENT_ID / SECRET belum di-set di Supabase (sekali saja via CLI)." }, 500);
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
  if (!refreshToken) throw new Error("Tidak ada refresh_token — pastikan consent offline access.");

  let email = "";
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ui.ok) email = (await ui.json()).email ?? "";
  } catch {
    email = "";
  }

  // Expression index lower(email) TIDAK mendukung PostgREST onConflict →
  // check-then-update/insert manual (pola sheets_accounts).
  const { data: existing } = await supabase
    .from("drive_accounts")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing?.id) {
    await supabase
      .from("drive_accounts")
      .update({
        oauth_refresh_token: refreshToken,
        enabled: true,
        label: body.label ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("drive_accounts").insert({
      email,
      oauth_refresh_token: refreshToken,
      label: body.label ?? null,
    });
  }
  return json({ ok: true, message: `Drive terhubung${email ? ` sebagai ${email}` : ""}.`, email });
}

async function handleListAccounts(supabase: any): Promise<Response> {
  const { data: accounts } = await supabase
    .from("drive_accounts")
    .select("id, email, enabled, max_users, label, updated_at")
    .order("created_at");
  const { count: totalUsers } = await supabase
    .from("drive_registry")
    .select("id", { count: "exact", head: true });
  const list = [] as any[];
  for (const a of accounts ?? []) {
    const { count } = await supabase
      .from("drive_registry")
      .select("id", { count: "exact", head: true })
      .eq("account_id", a.id);
    list.push({ ...a, users: count ?? 0 });
  }
  return json({ accounts: list, total_users: totalUsers ?? 0 });
}

async function handleRevokeAccount(supabase: any, body: any): Promise<Response> {
  const { account_id } = body;
  if (!account_id) return json({ error: "account_id wajib diisi." }, 400);
  await supabase
    .from("drive_accounts")
    .update({ enabled: false, oauth_refresh_token: null, updated_at: new Date().toISOString() })
    .eq("id", account_id);
  return json({ ok: true });
}

async function handleListRegistry(supabase: any): Promise<Response> {
  const { data } = await supabase
    .from("drive_registry")
    .select("*")
    .order("user_id")
    .limit(500);
  return json({ registry: data ?? [] });
}

async function handleEnsure(supabase: any, body: any): Promise<Response> {
  const { user_id, variant = "", email } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  const { data: reg } = await supabase
    .from("drive_registry")
    .select("*")
    .eq("user_id", user_id)
    .eq("variant", variant)
    .maybeSingle();
  if (reg) return json({ registry: reg });
  const accountId = await pickLeastLoadedAccount(supabase);
  const { data: created } = await supabase
    .from("drive_registry")
    .upsert(
      {
        user_id,
        variant,
        email: email ?? null,
        account_id: accountId,
        status: accountId ? "pending" : "no_account",
      },
      { onConflict: "user_id,variant" },
    )
    .select()
    .maybeSingle();
  return json({ registry: created });
}

async function handleSyncLatest(supabase: any, body: any): Promise<Response> {
  const { user_id, variant = "" } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  try {
    const result = await syncLatestFor(supabase, user_id, variant);
    return json({ ok: true, ...result });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // Backup belum ada di bucket (user belum pernah upload) → bukan error.
    if (msg.includes("tidak ditemukan") || msg.includes("kosong")) {
      return json({ ok: false, skipped: msg });
    }
    return json({ error: msg }, 500);
  }
}

async function handleMeta(supabase: any, body: any): Promise<Response> {
  const { user_id, variant = "" } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  const { data: reg } = await supabase
    .from("drive_registry")
    .select("drive_file_id, account_id, last_uploaded_at, last_size_bytes")
    .eq("user_id", user_id)
    .eq("variant", variant)
    .maybeSingle();
  if (!reg?.drive_file_id) return json({ meta: null });
  const token = await tokenForRegistry(supabase, reg.account_id ?? null);
  const file = await driveFetch(
    token,
    `${DRIVE_API}/files/${reg.drive_file_id}?fields=id,modifiedTime,size`,
  );
  return json({
    meta: {
      modified_time: file?.modifiedTime ?? null,
      size: file?.size ? Number(file.size) : reg.last_size_bytes,
    },
  });
}

/** Migrasi SEMUA backup yang ada di bucket → Drive (19 user aktif, sekali jalan). */
async function handleMigrateAll(supabase: any): Promise<Response> {
  const { data: accounts } = await supabase
    .from("drive_accounts")
    .select("id, oauth_refresh_token")
    .eq("enabled", true)
    .not("oauth_refresh_token", "is", null)
    .limit(1);
  if (!accounts || accounts.length === 0) {
    return json({ error: "Belum ada akun Google Drive terhubung." }, 400);
  }
  const token = await getAccessTokenFromRefresh(accounts[0].oauth_refresh_token);
  const folderId = await ensureFolder(token);

  const results: Record<string, any> = {};
  let copied = 0;
  let failed = 0;
  // Root bucket = folder per user (uid).
  const { data: users, error: e1 } = await supabase.storage
    .from(BACKUP_BUCKET)
    .list("", { limit: 1000 });
  if (e1) return json({ error: `List bucket gagal: ${e1.message}` }, 500);
  for (const u of users ?? []) {
    if (!u.id && !u.name) continue;
    const uid = u.name;
    if (uid === BACKUP_FILENAME || uid.endsWith(".json")) continue; // file liar
    const { data: variants } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list(uid, { limit: 100 });
    const perUser: Record<string, any> = {};
    for (const v of variants ?? []) {
      const variant = v.name;
      if (variant.includes(".")) continue; // hanya folder varian
      try {
        const r = await copyBackupToDrive(supabase, token, folderId, uid, variant);
        perUser[variant] = { ok: true, size: r.size, action: r.action };
        copied++;
      } catch (e: any) {
        perUser[variant] = { ok: false, error: String(e?.message ?? e).slice(0, 200) };
        failed++;
      }
    }
    results[uid] = perUser;
  }
  return json({ ok: true, copied, failed, results });
}

async function handleMigrateUser(supabase: any, body: any): Promise<Response> {
  const { user_id, variant = "" } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  await handleEnsure(supabase, { user_id, variant });
  try {
    const r = await syncLatestFor(supabase, user_id, variant);
    return json({ ok: true, ...r });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
}

// ─── Router ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-admin-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const supabase = serviceClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "";

    // ── Admin ──
    const adminActions = [
      "consent_url", "add_account", "list_accounts", "revoke_account",
      "list_registry", "migrate_user", "migrate_all",
    ];
    if (adminActions.includes(action)) {
      if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);
      switch (action) {
        case "consent_url":
          return handleConsentUrl();
        case "add_account":
          return await handleAddAccount(supabase, body);
        case "list_accounts":
          return await handleListAccounts(supabase);
        case "revoke_account":
          return await handleRevokeAccount(supabase, body);
        case "list_registry":
          return await handleListRegistry(supabase);
        case "migrate_user":
          return await handleMigrateUser(supabase, body);
        case "migrate_all":
          return await handleMigrateAll(supabase);
      }
    }

    // ── User app ──
    switch (action) {
      case "ensure":
        return await handleEnsure(supabase, body);
      case "sync_latest":
        return await handleSyncLatest(supabase, body);
      case "meta":
        return await handleMeta(supabase, body);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error(`[cloud-google] ${e?.stack ?? e}`);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
