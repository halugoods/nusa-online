const WORKER_URL = process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

const ADMIN_KEY = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nusa_admin_key") ?? "";
};

export interface UserRow {
  uid: string;
  email: string;
  storeName: string;
  licenseActive: boolean;
  licenseExpiresAt: string;
  lastBackupAt: string;
  backupSizeMB: number;
  deviceCount: number;
  lastSyncAt: string;
  productCount: number;
  transactionCount: number;
  issues: string[];
}

export async function getAllUsers(): Promise<{ users: UserRow[]; total: number }> {
  const res = await fetch(`${WORKER_URL}/api/sync-delta/users`, {
    headers: { "x-admin-key": ADMIN_KEY() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getDiagnostic(uid: string): Promise<any> {
  // Fetch user detail (license + backup) and sync status in parallel
  const [detailRes, statusRes] = await Promise.all([
    fetch(`${WORKER_URL}/api/export/user-detail?googleUserId=${encodeURIComponent(uid)}`, {
      headers: { "x-admin-key": ADMIN_KEY() },
    }),
    fetch(`${WORKER_URL}/api/sync-delta/status?uid=${encodeURIComponent(uid)}`, {
      headers: { "x-admin-key": ADMIN_KEY() },
    }),
  ]);

  const detail = detailRes.ok ? await detailRes.json() : { found: false };
  const status = statusRes.ok ? await statusRes.json() : {};

  // Map to DiagnosticTab expected shape
  const rec = detail?.records?.[0];
  const license = rec?.license;
  const backup = rec?.backup;

  return {
    uid,
    license: license ? {
      key: license.key,
      status: license.status,
      active: license.status === "Active",
      expiresAt: license.expires_at ?? "",
      email: license.owner_email ?? "",
      product: license.product,
    } : null,
    backup: backup ? {
      lastAt: backup.last_backup_at ?? "",
      sizeMB: Math.round((backup.size_bytes ?? 0) / 1024 / 1024 * 100) / 100,
      exists: backup.exists,
      path: backup.path,
    } : null,
    sync: {
      deviceCount: status?.devices?.length ?? 0,
      lastSyncAt: status?.last_sync_at ?? "",
      pendingDeltas: status?.pending_deltas ?? 0,
      devices: status?.devices ?? [],
    },
    data: {
      productCount: 0,
      transactionCount: 0,
    },
  };
}

export async function forceBackup(uid: string): Promise<any> {
  const res = await fetch(`${WORKER_URL}/api/sync-delta/portal-repair-backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function forceSync(uid: string): Promise<any> {
  const res = await fetch(`${WORKER_URL}/api/sync-delta/portal-repair-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function repairData(uid: string): Promise<any> {
  const res = await fetch(`${WORKER_URL}/api/sync-delta/portal-repair-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resyncImages(uid: string): Promise<any> {
  const res = await fetch(`${WORKER_URL}/api/sync-delta/portal-repair-images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
