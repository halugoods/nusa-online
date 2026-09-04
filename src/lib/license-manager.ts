"use client";

// v2.2.57+130 (Milestone D): license-manager pindah ke worker Cloudflare.
// POST {WORKER}/api/license-manager/{action} — action di path, body = params.
// Auth: x-admin-key header saja (worker cek terhadap NUSA_ADMIN_KEY).

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods.workers.dev";

export type LicenseTier = 'trial' | '1month' | 'lifetime';
export type LicenseStatus = "Generated" | "Trial" | "Active" | "Cancelled" | "Expired";

export const PRODUCTS: { id: string; name: string }[] = [
  { id: "nusa-kelontong", name: "Kelontong" },
  { id: "nusa-fnb", name: "F&B" },
  { id: "nusa-laundry", name: "Laundry" },
  { id: "nusa-bengkel", name: "Bengkel" },
  { id: "nusa-salon", name: "Salon" },
  { id: "nusa-apotek", name: "Apotek" },
  { id: "nusa-fotocopy", name: "Fotocopy" },
  { id: "nusa-servis", name: "Servis" },
];

export const TIERS: { id: LicenseTier; label: string; desc: string }[] = [
  { id: "trial", label: "Trial 3 Hari", desc: "Gratis, 3 hari" },
  { id: "1month", label: "Bulanan (Rp 49K)", desc: "1 bulan penuh" },
  { id: "lifetime", label: "Lifetime (Rp 249K)", desc: "Selamanya" },
];

export interface LicenseRecord {
  id: string;
  key: string;
  serial: string;
  product: string;
  tier: LicenseTier;
  status: LicenseStatus;
  owner_email: string | null;
  google_user_id?: string | null;
  activation_count: number;
  created_at: string;
  last_app_version?: string | null;
  last_app_build?: number | null;
  last_seen_at?: string | null;
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
  Generated: number;
  Trial: number;
  Active: number;
  Cancelled: number;
  Expired: number;
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

  const res = await fetch(`${WORKER_URL}/api/license-manager/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_URL}/api/license-manager/stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
      body: JSON.stringify({}),
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
  search?: string,
  product?: string,
  tier?: string,
): Promise<LicenseListResponse> {
  return call("list", { page, limit, status, search, product, tier });
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
  sendEmail?: boolean,
  product?: string,
  tier?: LicenseTier,
): Promise<{ ok: boolean; count: number; keys: string[]; product?: string; tier?: string; expires_at?: string; email_sent?: boolean; email_error?: string }> {
  return call("generate", {
    count,
    owner_email: ownerEmail ?? null,
    buyer_name: buyerName ?? null,
    send_email: sendEmail ?? false,
    product: product ?? undefined,
    tier: tier ?? undefined,
  });
}

export async function addKey(
  key: string,
  serial: string,
  ownerEmail?: string,
  product?: string,
): Promise<{ ok: boolean; key: string }> {
  return call("add", { key, serial, owner_email: ownerEmail ?? null, product: product ?? undefined });
}

export async function revokeLicense(
  licenseId: string
): Promise<{ ok: boolean; message: string }> {
  return call("revoke", { license_id: licenseId });
}

export async function setLicenseStatus(
  licenseId: string,
  status: LicenseStatus,
  reason?: string
): Promise<{ ok: boolean; message: string }> {
  return call("set_status", {
    license_id: licenseId,
    status,
    reason: reason ?? null,
  });
}

export async function deleteLicense(
  licenseId: string
): Promise<{ ok: boolean; message: string }> {
  return call("delete", { license_id: licenseId });
}

export interface MinVersionRecord {
  product: string;
  min_version: string;
  min_build: number;
  download_url: string | null;
  updated_at: string;
}

export async function getMinVersions(): Promise<MinVersionRecord[]> {
  const data = await call("get_min_versions");
  return data.versions ?? [];
}

export async function setMinVersion(
  product: string,
  minVersion: string,
  minBuild: number,
  downloadUrl?: string | null
): Promise<{ ok: boolean; cleared?: boolean }> {
  return call("set_min_version", {
    product,
    min_version: minVersion,
    min_build: minBuild,
    download_url: downloadUrl ?? null,
  });
}
