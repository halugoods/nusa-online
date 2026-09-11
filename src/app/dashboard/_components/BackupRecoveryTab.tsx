"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getUserDetail,
  getUserNus1,
  downloadUserNus1,
  buildFixPromptYaml,
  exportD1,
  parseNus1,
  restoreBackup,
  type UserDetail,
  type UserNus1,
} from "@/lib/export_backup";
import BackupViewer from "@/components/backup-viewer/BackupViewer";

interface UserRow {
  email: string;
  googleUserId: string;
  product: string;
  licenseKey: string;
  licenseStatus: string;
  tier: string;
  backupExists: boolean;
  backupSize: number;
  activations: number;
  createdAt: string;
}

// ─── Tab Backup & Recovery — dashboard nusa-online ─────────────────────
// Tabel semua user aktif + search by email + akses download .nus1 & prompt.

export default function BackupRecoveryTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [nus1Map, setNus1Map] = useState<Record<string, UserNus1>>({});
  const [promptMap, setPromptMap] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [downloading, setDownloading] = useState("");

  const [d1Loading, setD1Loading] = useState(false);
  const [d1Status, setD1Status] = useState("");

  // ── Load all users from D1 (via export endpoint) ────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev"}/api/export/d1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": localStorage.getItem("nusa_admin_key") ?? "" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      const licenses: any[] = data.tables?.licenses ?? [];
      const activations: any[] = data.tables?.activations ?? [];

      const rows: UserRow[] = licenses.map((lic) => {
        const licActivations = activations.filter((a) => a.license_id === lic.id);
        return {
          email: lic.owner_email ?? "—",
          googleUserId: lic.google_user_id ?? "—",
          product: lic.product ?? "—",
          licenseKey: lic.key ?? "—",
          licenseStatus: lic.status ?? "—",
          tier: lic.tier ?? "lifetime",
          backupExists: false, // will be updated
          backupSize: 0,
          activations: licActivations.length,
          createdAt: lic.created_at ?? "",
        };
      });

      setUsers(rows);
      setFilteredUsers(rows);
    } catch (e: any) {
      setError(e.message ?? "Gagal load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filter by email ─────────────────────────────────────────────────

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter((u) => u.email.toLowerCase().includes(q)));
    }
  }, [search, users]);

  // ── Fetch .nus1 + prompt for a user ─────────────────────────────────

  const fetchNus1 = useCallback(async (email: string) => {
    if (nus1Map[email]) return;
    try {
      const detail = await getUserDetail(email);
      const nus1 = await getUserNus1(email);
      setNus1Map((prev) => ({ ...prev, [email]: nus1 }));
      if (detail.found) {
        const yaml = buildFixPromptYaml(detail, nus1);
        setPromptMap((prev) => ({ ...prev, [email]: yaml }));
      }
    } catch {}
  }, [nus1Map]);

  // ── Download .nus1 ──────────────────────────────────────────────────

  const downloadNus1 = useCallback(async (email: string) => {
    setDownloading(email);
    try {
      await downloadUserNus1(email);
    } catch (e: any) {
      setError(`Download gagal: ${e.message}`);
    } finally {
      setDownloading("");
    }
  }, []);

  // ── Export D1 ───────────────────────────────────────────────────────

  const handleExportD1 = useCallback(async () => {
    setD1Loading(true);
    setD1Status("");
    try {
      const data = await exportD1();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `d1_export_${data.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setD1Status(`Export berhasil: ${Object.keys(data.tables).length} tabel, ${Object.values(data.counts).reduce((a, b) => a + b, 0)} rows`);
    } catch (e: any) {
      setD1Status(`Export gagal: ${e.message}`);
    } finally {
      setD1Loading(false);
    }
  }, []);

  // ── Copy to clipboard ───────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("Gagal copy");
    }
  }, []);

  // ── Format bytes ────────────────────────────────────────────────────

  const fmtBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Backup & Recovery</h2>
          <p className="text-sm text-gray-500 mt-1">
            Semua user aktif — klik tombol aksi untuk download .nus1 atau copy prompt.
          </p>
        </div>
        <button
          onClick={handleExportD1}
          disabled={d1Loading}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {d1Loading ? "Exporting..." : "Export D1 → JSON"}
        </button>
      </div>
      {d1Status && <p className="text-xs text-gray-600">{d1Status}</p>}

      {/* ── Self-Service Restore ───────────────────────────────────── */}
      <SelfServiceRestore />

      {/* ── Backup File Viewer (Spreadsheet + Image Tooltip) ──────── */}
      <div className="mt-8">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Spreadsheet Viewer
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload file .nus1 untuk lihat data dalam bentuk spreadsheet —
            kolom gambar bisa di-hover untuk preview.
          </p>
        </div>
        <BackupViewer />
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <input
          type="text"
          placeholder="Cari email user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat user...</div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      {!loading && filteredUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Google UID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Varian</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Key</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.licenseKey} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.googleUserId.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-gray-600">{u.product}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.licenseStatus === "Active"
                          ? "bg-green-50 text-green-700"
                          : u.licenseStatus === "Generated"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {u.licenseStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.licenseKey.slice(0, 16)}...</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadNus1(u.email)}
                          disabled={downloading === u.email}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:opacity-80 disabled:opacity-50"
                          title="Download .nus1"
                        >
                          {downloading === u.email ? "..." : ".nus1"}
                        </button>
                        <button
                          onClick={async () => {
                            await fetchNus1(u.email);
                            const prompt = promptMap[u.email];
                            if (prompt) copyToClipboard(prompt, u.email);
                          }}
                          className="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:opacity-80"
                          title="Copy prompt perbaikan"
                        >
                          {copied === u.email ? "✓" : "Copy"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
            {search && ` (filter: "${search}")`}
          </div>
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search ? "Tidak ada user cocok" : "Belum ada user"}
        </div>
      )}

      {/* ── Prompt Preview (jika ada yg di-copy) ────────────────────── */}
      {copied && promptMap[copied] && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Prompt untuk {copied}</h3>
            <button
              onClick={() => copyToClipboard(promptMap[copied], copied + "_2")}
              className="text-xs text-primary hover:underline"
            >
              {copied === copied + "_2" ? "✓ Tersalin!" : "Copy ulang"}
            </button>
          </div>
          <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
            {promptMap[copied]}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Self-Service Restore ──────────────────────────────────────────────
// Upload .nus1 → parse → encrypt → upload ke R2 → generate key (optional)

const PRODUCTS = [
  { id: "nusa-kelontong", name: "Kelontong" },
  { id: "nusa-fnb", name: "F&B" },
  { id: "nusa-laundry", name: "Laundry" },
  { id: "nusa-bengkel", name: "Bengkel" },
  { id: "nusa-salon", name: "Salon" },
  { id: "nusa-apotek", name: "Apotek" },
  { id: "nusa-fotocopy", name: "Fotocopy" },
  { id: "nusa-servis", name: "Servis" },
];

function SelfServiceRestore() {
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState("nusa-kelontong");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState<{ entries: string[]; has_db: boolean; db_size_bytes: number; user_found: boolean; google_user_id: string | null; license_key: string | null; license_status: string | null } | null>(null);
  const [mode, setMode] = useState<"pro" | "lite">("pro");
  const [generateKey, setGenerateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    setParseResult(null);
    setError("");
    setSuccess("");

    // Parse locally
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const base64 = btoa(String.fromCharCode(...buf));
      const res = await parseNus1(base64, email || undefined, product);
      setParseResult(res);
    } catch (err: any) {
      setError(err.message ?? "Gagal parse file");
    }
  };

  const handleRestore = async () => {
    if (!file || !email) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const base64 = btoa(String.fromCharCode(...buf));
      const res = await restoreBackup(base64, email, product, generateKey, mode);
      setSuccess(res.message ?? "Restore berhasil!");
    } catch (err: any) {
      setError(err.message ?? "Gagal restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Self-Service Restore</h3>
        <p className="text-xs text-gray-500 mt-1">
          Upload file .nus1 user → otomatis encrypt & upload ke cloud. User bisa login & restore data sendiri.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email User</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@gmail.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Product */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Varian</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "pro" | "lite")}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="pro">Pro — AI, Cabang, Spreadsheet, Toko Online</option>
            <option value="lite">Lite — Tanpa AI/Cabang/Online/Sync</option>
          </select>
        </div>

        {/* File */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">File .nus1</label>
          <input
            ref={fileRef}
            type="file"
            accept=".nus1,.sqlite,.db"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary"
          >
            {fileName || "Pilih file..."}
          </button>
        </div>
      </div>

      {/* Parse Result */}
      {parseResult && (
        <div className={`rounded-lg p-3 text-xs space-y-1 ${parseResult.user_found && parseResult.has_db ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
          <div><strong>File:</strong> {parseResult.entries.join(", ")} ({parseResult.db_size_bytes} bytes)</div>
          <div><strong>User ditemukan:</strong> {parseResult.user_found ? "Ya" : "Tidak"}</div>
          {parseResult.user_found && (
            <>
              <div><strong>Google UID:</strong> {parseResult.google_user_id}</div>
              <div><strong>License:</strong> {parseResult.license_key} ({parseResult.license_status})</div>
            </>
          )}
          {!parseResult.has_db && (
            <div className="text-red-700"><strong>PERINGATAN:</strong> File tidak mengandung nusa_kasir.sqlite!</div>
          )}
        </div>
      )}

      {/* Generate Key Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="genKey"
          checked={generateKey}
          onChange={(e) => setGenerateKey(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="genKey" className="text-xs text-gray-600">
          Generate key baru otomatis (untuk user yg kehilangan key)
        </label>
      </div>

      {/* Error / Success */}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}

      {/* Action */}
      <button
        onClick={handleRestore}
        disabled={!file || !email || loading || !parseResult?.has_db}
        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Memproses..." : "Restore Backup"}
      </button>
    </div>
  );
}
