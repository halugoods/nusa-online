"use client";

// ─── Sheets admin manager — dashboard nusa-online (Spreadsheet tab) ──────
// Edge function `sheets-admin`:
//   GET  /                        → status kredensial (enabled?) — aman anonim
//   POST {action:"save_credential"}  → simpan service account JSON (admin)
//   POST {action:"test_credential"}  → test koneksi Google (admin)
//   POST {action:"list_users"}       → registry semua user + link (admin)
//
// Kredensial: service account JSON milik NUSA (client_email + private_key).
// Panduan buat:
//   1. https://console.cloud.google.com → pilih/create project
//   2. Aktifkan "Google Sheets API" (APIs & Services → Library)
//   3. Aktifkan "Google Drive API" (untuk share ke email user)
//   4. IAM & Admin → Service Accounts → Create service account
//   5. Klik akun → Keys → Add Key → Create new key → JSON (download)
//   6. Paste isi file JSON di bawah lalu Simpan.

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

export async function fetchSheetsStatus(): Promise<{ enabled: boolean }> {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return { enabled: false };
    return (await res.json()) as { enabled: boolean };
  } catch {
    return { enabled: false };
  }
}

function adminKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nusa_admin_key");
}

async function postAction(action: string, payload: Record<string, unknown> = {}) {
  const key = adminKey();
  if (!key) throw new Error("Not authenticated");
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-admin-key": key,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function saveSheetsCredential(serviceAccountJson: string): Promise<void> {
  await postAction("save_credential", { service_account_json: serviceAccountJson });
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
