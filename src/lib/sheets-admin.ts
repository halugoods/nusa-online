"use client";

// ─── Sheets admin manager — dashboard nusa-online (Spreadsheet tab) ──────
// Worker `sheets-admin` (OAuth Company Account):
//   GET  /api/sheets-admin/status          → status koneksi (enabled? owner email?) — publik
//   POST /api/sheets-admin/oauth_status      → info akun Google terhubung (admin)
//   POST /api/sheets-admin/oauth_callback    → tukar OAuth code → refresh token (admin)
//   POST /api/sheets-admin/test_credential   → test koneksi Google (admin)
//   POST /api/sheets-admin/list_users        → registry semua user + link (admin)
//
// Auth: x-admin-key header (worker cek terhadap NUSA_ADMIN_KEY).

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

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
    const res = await fetch(`${WORKER_URL}/api/sheets-admin/status`);
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
  const res = await fetch(`${WORKER_URL}/api/sheets-admin/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(payload),
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
