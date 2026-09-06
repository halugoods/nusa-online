"use client";

// v2.2.57+130: export & backup recovery endpoints (worker Cloudflare).
// POST /api/export/{d1,user-detail,user-nus1}

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

const ADMIN_KEY = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nusa_admin_key") ?? "";
};

export interface UserDetailRecord {
  license: Record<string, any>;
  activations: Record<string, any>[];
  backup: { path: string; exists: boolean; size_bytes: number };
}

export interface UserDetail {
  found: boolean;
  email?: string;
  googleUserId?: string;
  product?: string;
  licenses_count?: number;
  records?: UserDetailRecord[];
  message?: string;
}

export interface UserNus1 {
  found: boolean;
  email?: string;
  googleUserId?: string;
  product?: string;
  license_key?: string;
  license_status?: string;
  backup_path?: string;
  backup_size_bytes?: number;
  nus1_size_bytes?: number;
  nus1_file_name?: string;
  nus1_base64?: string;
  created_at?: string;
  message?: string;
}

export interface D1Export {
  exported_at: string;
  worker: string;
  tables: Record<string, Record<string, any>[]>;
  counts: Record<string, number>;
  errors?: Record<string, string>;
}

export async function exportD1(): Promise<D1Export> {
  const res = await fetch(`${WORKER_URL}/api/export/d1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function getUserDetail(email?: string, googleUserId?: string): Promise<UserDetail> {
  const res = await fetch(`${WORKER_URL}/api/export/user-detail`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ email, googleUserId }),
  });
  return res.json();
}

export async function getUserNus1(email?: string, googleUserId?: string): Promise<UserNus1> {
  const res = await fetch(`${WORKER_URL}/api/export/user-nus1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ email, googleUserId }),
  });
  return res.json();
}

// Download .nus1 as file stream (bypass JSON/base64 limit for large files)
export async function downloadUserNus1(email?: string, googleUserId?: string): Promise<void> {
  const res = await fetch(`${WORKER_URL}/api/export/user-nus1-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY() },
    body: JSON.stringify({ email, googleUserId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const fileName = match?.[1] ?? 'backup.nus1';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Prompt builder ────────────────────────────────────────────────────

export function buildFixPrompt(user: UserDetail, nus1: UserNus1): string {
  const lines: string[] = [];
  lines.push("## Konteks");
  lines.push(`- Email: ${user.email ?? "unknown"}`);
  lines.push(`- Google UID: ${user.googleUserId ?? "unknown"}`);
  lines.push(`- Varian: ${user.product ?? "unknown"}`);
  lines.push(`- Total lisensi: ${user.licenses_count ?? 0}`);
  lines.push("");

  if (user.records) {
    for (const rec of user.records) {
      const lic = rec.license;
      lines.push("## Lisensi");
      lines.push(`- Key: ${lic.key}`);
      lines.push(`- Serial: ${lic.serial}`);
      lines.push(`- Status: ${lic.status}`);
      lines.push(`- Tier: ${lic.tier ?? "lifetime"}`);
      lines.push(`- Product: ${lic.product}`);
      lines.push(`- Owner email: ${lic.owner_email ?? "belum terisi"}`);
      lines.push(`- Google UID: ${lic.google_user_id ?? "belum terisi"}`);
      lines.push(`- Dibuat: ${lic.created_at}`);
      lines.push("");
      lines.push("## Backup Cloud");
      lines.push(`- Path: ${rec.backup.path}`);
      lines.push(`- Ada: ${rec.backup.exists ? "Ya" : "Tidak"}`);
      lines.push(`- Ukuran: ${rec.backup.size_bytes} bytes`);
      lines.push("");
      lines.push("## Aktivasi");
      lines.push(`- Total: ${rec.activations.length}`);
      for (const act of rec.activations) {
        lines.push(`  - ${act.device_id} (${act.created_at})`);
      }
      lines.push("");
    }
  }

  if (nus1.found && nus1.nus1_base64) {
    lines.push("## File .nus1 (base64)");
    lines.push(`- Nama file: ${nus1.nus1_file_name}`);
    lines.push(`- Ukuran: ${nus1.nus1_size_bytes} bytes`);
    lines.push(`- Download: POST /api/export/user-nus1 dengan email/uid yang sama`);
    lines.push("");
  }

  lines.push("## Yang Perlu Dilakukan");
  lines.push("1. Cek apakah user masih bisa login Google di app");
  lines.push("2. Kalau tidak bisa, cek SHA-1 Firebase vs APK yang di-install");
  lines.push("3. Kalau data hilang, kirim file .nus1 ke user via WA");
  lines.push("4. User install ulang APK → login Google → masukin key → restore otomatis");
  lines.push("");

  return lines.join("\n");
}

export function buildFixPromptYaml(user: UserDetail, nus1: UserNus1): string {
  // YAML-friendly format untuk user (copy-paste ke WA)
  const lines: string[] = [];
  const lic = user.records?.[0]?.license;
  const rec = user.records?.[0];

  lines.push(`Email: ${user.email ?? "unknown"}`);
  lines.push(`Google UID: ${user.googleUserId ?? "unknown"}`);
  lines.push(`Varian: ${user.product ?? "unknown"}`);
  lines.push(`Key: ${lic?.key ?? "N/A"}`);
  lines.push(`Status Lisensi: ${lic?.status ?? "N/A"}`);
  lines.push(`Backup Ada: ${rec?.backup.exists ? "Ya" : "Tidak"}`);
  lines.push(`Backup Ukuran: ${rec?.backup.size_bytes ?? 0} bytes`);
  lines.push(`Total Aktivasi: ${rec?.activations.length ?? 0}`);

  return lines.join("\n");
}
