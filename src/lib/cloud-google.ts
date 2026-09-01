"use client";

// ─── Cloud Google (backup Drive) — dashboard nusa-online ─────────────────
// Edge function `cloud-google`:
//   Admin (x-admin-key): consent_url, add_account, list_accounts,
//     revoke_account, list_registry, migrate_user, migrate_all
//   User app (anon): ensure, sync_latest, meta
//
// Arsitektur 2-cloud FINAL: Spreadsheet (laporan) = tab Google Sheets dengan
// akun khusus sheets; Cloud Google (backup data user) = tab ini dengan akun
// Drive TERPISAH. Backup SQLite user: upload tetap ke Supabase (dobel),
// server copy terbaru bucket → Drive (aman dari body-limit edge fn).

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cloud-google`;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface DriveAccount {
  id: string;
  email: string;
  enabled: boolean;
  max_users: number;
  label: string | null;
  users: number;
  updated_at: string;
}

export interface DriveRegistryRow {
  user_id: string;
  variant: string;
  email: string | null;
  drive_file_id: string | null;
  drive_link: string | null;
  account_id: string | null;
  last_size_bytes: number | null;
  last_uploaded_at: string | null;
  status: string;
  error: string | null;
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

export async function fetchDriveConsentUrl(): Promise<string> {
  const data = await postAction("consent_url");
  if (!data.url) throw new Error(data.error ?? "Gagal ambil URL login Google");
  return data.url as string;
}

export async function submitDriveAccountCode(
  code: string,
  label?: string,
): Promise<{ ok: boolean; email: string; message?: string }> {
  const data = await postAction("add_account", { code, label });
  return { ok: data.ok === true, email: data.email ?? "", message: data.message };
}

export async function listDriveAccounts(): Promise<DriveAccount[]> {
  const data = await postAction("list_accounts");
  return (data.accounts as DriveAccount[]) ?? [];
}

export async function revokeDriveAccount(accountId: string): Promise<{ ok: boolean }> {
  const data = await postAction("revoke_account", { account_id: accountId });
  return { ok: data.ok === true };
}

export async function listDriveRegistry(): Promise<DriveRegistryRow[]> {
  const data = await postAction("list_registry");
  return (data.registry as DriveRegistryRow[]) ?? [];
}

export async function migrateDriveUser(userId: string): Promise<{ ok: boolean; size?: number; action?: string }> {
  const data = await postAction("migrate_user", { user_id: userId });
  return { ok: data.ok === true, size: data.size, action: data.action };
}

export interface MigrateAllResult {
  ok: boolean;
  copied: number;
  failed: number;
  results: Record<string, Record<string, { ok: boolean; size?: number; error?: string }>>;
}

export async function migrateDriveAll(): Promise<MigrateAllResult> {
  return (await postAction("migrate_all")) as MigrateAllResult;
}

export function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
