"use client";

// ─── Sheets admin manager — dashboard nusa-online (Spreadsheet tab) ──────
// Edge function `sheets-admin` (OAuth Company Account):
//   GET  /                        → status koneksi (enabled? owner email?) — aman anonim
//   POST {action:"oauth_status"}    → info akun Google terhubung (admin)
//   POST {action:"oauth_callback",code} → tukar OAuth code → refresh token (admin)
//   POST {action:"test_credential"} → test koneksi Google (admin)
//   POST {action:"list_users"}      → registry semua user + link (admin)
//
// Alur: admin login Google sekali (paste code) → refresh token disimpan di
// sheets_settings → server buat & isi spreadsheet atas nama company account.
// App user tidak perlu login Google.

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sheets-admin`;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface SheetsRegistryUser {
  id: string;
  user_id: string;
  email: string | null;
  store_name: string | null;
  variant: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  status: "pending" | "ready" | "error";
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SheetsOAuthStatus {
  enabled: boolean;
  owner_email: string | null;
  has_credential: boolean;
}

export async function fetchSheetsStatus(): Promise<{
  enabled: boolean;
  owner_email: string | null;
}> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return { enabled: false, owner_email: null };
    const data = (await res.json()) as { enabled?: boolean; owner_email?: string | null };
    return { enabled: data.enabled === true, owner_email: data.owner_email ?? null };
  } catch {
    return { enabled: false, owner_email: null };
  }
}

async function postAction(action: string, payload: Record<string, unknown> = {}) {
  const adminKey = typeof window !== "undefined"
    ? localStorage.getItem("nusa_admin_key")
    : null;
  if (!adminKey) throw new Error("Not authenticated");
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function fetchOAuthStatus(): Promise<SheetsOAuthStatus> {
  const data = await postAction("oauth_status");
  return {
    enabled: data.enabled === true,
    owner_email: data.owner_email ?? null,
    has_credential: data.has_credential === true,
  };
}

/** Ambil URL consent Google (paste-code flow). Admin klik → login Google → dapat code. */
export async function fetchOAuthConsentUrl(): Promise<string> {
  const data = await postAction("oauth_consent_url");
  if (!data.url) throw new Error(data.error ?? "Gagal ambil URL login Google");
  return data.url as string;
}

export async function submitOAuthCode(code: string): Promise<{ ok: boolean; owner_email: string }> {
  const data = await postAction("oauth_callback", { code });
  return { ok: data.ok === true, owner_email: data.owner_email ?? "" };
}

export interface SheetsTestResult {
  ok: boolean;
  message: string;
  url?: string;
  latency_ms?: number;
}

export async function testSheetsCredential(): Promise<SheetsTestResult> {
  const data = await postAction("test_credential");
  return {
    ok: data.ok === true,
    message: data.message ?? (data.ok ? "OK" : "Gagal"),
    url: data.url,
    latency_ms: data.latency_ms,
  };
}

export async function listSheetsUsers(): Promise<SheetsRegistryUser[]> {
  const data = await postAction("list_users");
  return (data.users as SheetsRegistryUser[]) ?? [];
}

// ─── Multi-akun Google (Blok 1 MASTER LIST) ──────────────────────────────

export interface SheetsAccount {
  id: string;
  email: string;
  enabled: boolean;
  max_users: number;
  label: string | null;
  users: number;
  created_at: string;
  updated_at: string;
}

export interface SheetsAccountsPayload {
  main_account: {
    email: string | null;
    enabled: boolean;
    users: number;
    max_users: number;
  };
  accounts: SheetsAccount[];
}

export async function listSheetsAccounts(): Promise<SheetsAccountsPayload> {
  return (await postAction("list_accounts")) as SheetsAccountsPayload;
}

/** OAuth code → akun Google TAMBAHAN (refresh token tersendiri di sheets_accounts). */
export async function submitOAuthCodeAccount(
  code: string,
  label?: string,
): Promise<{ ok: boolean; email: string }> {
  const data = await postAction("oauth_callback_account", { code, label });
  return { ok: data.ok === true, email: data.email ?? "" };
}

export async function revokeSheetsAccount(accountId: string): Promise<{ ok: boolean }> {
  const data = await postAction("revoke_account", { account_id: accountId });
  return { ok: data.ok === true };
}

// ─── Arsip bulanan (cold storage) ────────────────────────────────────────

export interface SheetsArchiveRow {
  user_id: string;
  bulan: string;
  tab: string;
  row_count: number;
  archived_at: string;
}

export async function listSheetsArchives(userId?: string): Promise<SheetsArchiveRow[]> {
  const data = await postAction("list_archives", userId ? { user_id: userId } : {});
  return (data.archives as SheetsArchiveRow[]) ?? [];
}

export async function archiveSheetsMonth(
  userId: string,
  bulan: string,
): Promise<{ ok: boolean; message: string; tabs: Record<string, number> }> {
  const data = await postAction("archive_month", { user_id: userId, bulan });
  return { ok: data.ok === true, message: data.message ?? "", tabs: data.tabs ?? {} };
}
