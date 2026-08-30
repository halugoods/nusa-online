// ============================================================================
// NUSA KASIR — Google Sheets Terpusat (Company API)
// ============================================================================
// Edge function yang menghubungkan app NUSA Kasir + dashboard admin ke
// Google Sheets atas nama SERVICE ACCOUNT milik NUSA (bukan akun per-user).
//
// Kredensial (service account JSON) disimpan di tabel `sheets_settings`
// (diisi admin via dashboard). App tidak perlu login Google lagi — cukup
// kirim `user_id` (canonical UID) + rows + request JSON, server yang
// menulis spreadsheet atas nama service account.
//
// SETUP SUPABASE DASHBOARD (secret, wajib):
//   NUSA_ADMIN_KEY = 280303   (sama dengan edge fn admin lain)
//
// ACTIONS:
//   Admin (header `x-admin-key`):
//     save_credential  {service_account_json}  → validasi + simpan (enabled=true)
//     test_credential  {}                      → buat spreadsheet uji, buktikan token jalan
//     list_users       {}                      → seluruh sheets_registry + link + status
//   User app (anon, identitas di body):
//     get_link         {user_id}               → spreadsheet_url yang sudah ada (404 kalau belum)
//     create_spreadsheet {user_id, email, store_name, variant}
//                                                → buat spreadsheet baru + share ke email user
//     write            {user_id, spreadsheet_id, tab, values[], requests[]}
//                                                → tulis data + format (validasi kepemilikan)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Google service account auth (JWT RS256 + token exchange) ────────────
// Tanpa SDK berat — generate JWT assertion lalu tukar di OAuth2 token
// endpoint. Scope: drive.file (hanya file yang dibuat sendiri oleh service
// account — spreadsheet buatan kita otomatis boleh ditulis).
const SHEETS_SCOPE = "https://www.googleapis.com/auth/drive.file";

function parseServiceAccount(raw: string): {
  clientEmail: string;
  privateKey: string;
} {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Service account JSON tidak valid — cek formatnya.");
  }
  const clientEmail = parsed["client_email"];
  const privateKey = parsed["private_key"];
  if (typeof clientEmail !== "string" || clientEmail === "") {
    throw new Error("JSON tidak punya client_email — bukan file service account.");
  }
  if (typeof privateKey !== "string" || privateKey === "") {
    throw new Error("JSON tidak punya private_key — bukan file service account.");
  }
  return { clientEmail, privateKey };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const { clientEmail, privateKey } = parseServiceAccount(serviceAccountJson);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encClaim = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claim)));
  const signingInput = `${encHeader}.${encClaim}`;

  // private_key dari file JSON adalah PEM PKCS#8. Bersihkan header/footer.
  const pemBody = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = base64UrlDecode(pemBody);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const token = data["access_token"] as string | undefined;
  if (!token) throw new Error("Token exchange gagal — tidak ada access_token.");
  return token;
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
    { method: "PUT", body: JSON.stringify({ values }) },
  );
  // Teruskan request format JSON apa adanya (template yang dikirim app).
  if (Array.isArray(requests) && requests.length > 0) {
    await googleFetch(token, `${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
}

// ─── Supabase helpers ────────────────────────────────────────────────────
function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function getCredential(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("sheets_settings")
    .select("service_account_json, enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Gagal baca sheets_settings: ${error.message}`);
  if (!data || !data.enabled || !data.service_account_json) {
    throw new Error("Fitur spreadsheet belum aktif — hubungi admin.");
  }
  return data.service_account_json as string;
}

async function upsertRegistry(
  supabase: any,
  user_id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("sheets_registry").upsert(
    { user_id, ...fields, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Gagal simpan sheets_registry: ${error.message}`);
}

// ─── Handlers ────────────────────────────────────────────────────────────

async function handleSaveCredential(supabase: any, body: any): Promise<Response> {
  const raw = typeof body.service_account_json === "string" ? body.service_account_json.trim() : "";
  if (!raw) return json({ error: "service_account_json wajib diisi." }, 400);
  parseServiceAccount(raw); // validasi
  await supabase.from("sheets_settings").upsert(
    {
      id: 1,
      service_account_json: raw,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return json({ ok: true, message: "Kredensial service account tersimpan." });
}

async function handleTestCredential(supabase: any): Promise<Response> {
  const raw = await getCredential(supabase);
  const token = await getAccessToken(raw);
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
  if (existing.data?.spreadsheet_id && existing.data?.spreadsheet_url) {
    return json({
      spreadsheet_id: existing.data.spreadsheet_id,
      spreadsheet_url: existing.data.spreadsheet_url,
      status: existing.data.status,
      created_now: false,
    });
  }

  await upsertRegistry(supabase, user_id, {
    email: email ?? null,
    store_name: store_name ?? null,
    variant: variant ?? null,
    status: "pending",
    error: null,
  });

  const raw = await getCredential(supabase);
  try {
    const token = await getAccessToken(raw);
    const storeName = store_name ? ` — ${store_name}` : "";
    const { spreadsheetId, url } = await sheetsCreate(
      token,
      `Laporan NUSA${storeName}`,
      ["Laporan", "Produk", "Transaksi", "Stok", "Keuangan", "Karyawan", "Pelanggan", "Supplier", "Promo", "Presensi"],
    );
    await sheetsShare(token, spreadsheetId, email);
    await upsertRegistry(supabase, user_id, {
      email: email ?? null,
      store_name: store_name ?? null,
      variant: variant ?? null,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: url,
      status: "ready",
      error: null,
    });
    return json({
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: url,
      status: "ready",
      created_now: true,
    });
  } catch (e: any) {
    await upsertRegistry(supabase, user_id, {
      status: "error",
      error: e.message ?? String(e),
    });
    throw e;
  }
}

async function handleWrite(supabase: any, body: any): Promise<Response> {
  const { user_id, spreadsheet_id, tab, values, requests } = body;
  if (!user_id) return json({ error: "user_id wajib diisi." }, 400);
  if (!spreadsheet_id) return json({ error: "spreadsheet_id wajib diisi." }, 400);
  if (!tab || !Array.isArray(values)) {
    return json({ error: "tab + values wajib diisi." }, 400);
  }

  // Validasi kepemilikan: user hanya boleh menulis ke spreadsheet miliknya.
  const reg = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (!reg.data || reg.data.spreadsheet_id !== spreadsheet_id) {
    return json({ error: "Spreadsheet bukan milik user ini." }, 403);
  }

  const raw = await getCredential(supabase);
  const token = await getAccessToken(raw);
  await sheetsWrite(token, spreadsheet_id, tab, values, requests ?? []);
  await upsertRegistry(supabase, user_id, {
    status: "ready",
    error: null,
    updated_at: new Date().toISOString(),
  });
  return json({ ok: true });
}

// ─── Dispatch ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = serviceClient();
  try {
    const isAdmin = req.headers.get("x-admin-key") === ADMIN_KEY;

    // GET → baca status kredensial (dipakai dashboard, aman anonim: tidak
    // pernah mengekspos service_account_json — cuma enabled).
    if (req.method === "GET") {
      const { data } = await supabase
        .from("sheets_settings")
        .select("enabled")
        .eq("id", 1)
        .maybeSingle();
      return json({ enabled: data?.enabled === true });
    }

    const body = await req.json();
    const action = body.action ?? "";
    let result: Response;

    switch (action) {
      // ── Admin ──
      case "save_credential":
      case "test_credential":
      case "list_users":
        if (!isAdmin) return json({ error: "Unauthorized" }, 401);
        result =
          action === "save_credential"
            ? await handleSaveCredential(supabase, body)
            : action === "test_credential"
            ? await handleTestCredential(supabase)
            : await handleListUsers(supabase);
        break;

      // ── User app ──
      case "get_link":
      case "create_spreadsheet":
      case "write":
        result =
          action === "get_link"
            ? await handleGetLink(supabase, body)
            : action === "create_spreadsheet"
            ? await handleCreateSpreadsheet(supabase, body)
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
