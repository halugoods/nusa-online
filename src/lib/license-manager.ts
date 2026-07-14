"use client";

const EDGE_FUNCTION_URL = "https://sakeuhcbcnueplzlkltm.supabase.co/functions/v1/license-manager";

export interface LicenseRecord {
  id: string;
  key: string;
  serial: string;
  product: string;
  status: "issued" | "activated" | "revoked";
  owner_email: string | null;
  google_user_id?: string | null;
  activation_count: number;
  created_at: string;
}

export interface ActivationRecord {
  id: string;
  license_id: string;
  device_id: string;
  google_user_id?: string | null;
  created_at: string;
}

export interface LicenseDetail extends LicenseRecord {
  activations: ActivationRecord[];
}

export interface LicenseStats {
  total: number;
  issued: number;
  activated: number;
  revoked: number;
  total_activations: number;
}

export interface LicenseListResponse {
  licenses: LicenseRecord[];
  total: number;
  page: number;
  limit: number;
}

let _adminKey: string | null = null;

export function getAdminKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("nusa_admin_key");
  }
  return _adminKey;
}

export function setAdminKey(key: string): void {
  _adminKey = key;
  if (typeof window !== "undefined") {
    localStorage.setItem("nusa_admin_key", key);
  }
}

export function clearAdminKey(): void {
  _adminKey = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("nusa_admin_key");
  }
}

export function isAuthenticated(): boolean {
  return getAdminKey() !== null;
}

async function call(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const adminKey = getAdminKey();
  if (!adminKey) throw new Error("Not authenticated");

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    // Try calling stats — if it works, key is valid
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
      body: JSON.stringify({ action: "stats" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getStats(): Promise<LicenseStats> {
  const data = await call("stats");
  return data.stats;
}

export async function listLicenses(
  page = 0,
  limit = 50,
  status?: string,
  search?: string
): Promise<LicenseListResponse> {
  return call("list", { page, limit, status, search });
}

export async function getLicenseDetail(
  licenseId: string
): Promise<LicenseDetail> {
  const data = await call("detail", { license_id: licenseId });
  return data.license;
}

export async function generateKeys(
  count: number,
  ownerEmail?: string,
  buyerName?: string,
  sendEmail?: boolean
): Promise<{ ok: boolean; count: number; keys: string[]; email_sent?: boolean; email_error?: string }> {
  return call("generate", {
    count,
    owner_email: ownerEmail ?? null,
    buyer_name: buyerName ?? null,
    send_email: sendEmail ?? false,
  });
}

export async function addKey(
  key: string,
  serial: string,
  ownerEmail?: string
): Promise<{ ok: boolean; key: string }> {
  return call("add", { key, serial, owner_email: ownerEmail ?? null });
}

export async function revokeLicense(
  licenseId: string
): Promise<{ ok: boolean; message: string }> {
  return call("revoke", { license_id: licenseId });
}

export async function deleteLicense(
  licenseId: string
): Promise<{ ok: boolean; message: string }> {
  return call("delete", { license_id: licenseId });
}
