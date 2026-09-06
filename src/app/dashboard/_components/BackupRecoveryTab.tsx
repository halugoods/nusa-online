"use client";

import { useState, useCallback } from "react";
import {
  exportD1,
  getUserDetail,
  getUserNus1,
  buildFixPrompt,
  buildFixPromptYaml,
  type UserDetail,
  type UserNus1,
} from "@/lib/export_backup";

// ─── Tab Backup & Recovery — dashboard nusa-online ─────────────────────
// 1. Cari user by email / Google UID
// 2. Lihat detail lisensi + backup
// 3. Download file .nus1
// 4. Copy prompt perbaikan (untuk dikirim ke AI/ZCode)

export default function BackupRecoveryTab() {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchUid, setSearchUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [nus1, setNus1] = useState<UserNus1 | null>(null);
  const [promptYaml, setPromptYaml] = useState("");
  const [promptMd, setPromptMd] = useState("");

  const [d1Loading, setD1Loading] = useState(false);
  const [d1Status, setD1Status] = useState("");

  const [copied, setCopied] = useState("");

  // ── Search user ─────────────────────────────────────────────────────

  const searchUser = useCallback(async () => {
    setLoading(true);
    setError("");
    setUserDetail(null);
    setNus1(null);
    setPromptYaml("");
    setPromptMd("");

    try {
      const email = searchEmail.trim() || undefined;
      const googleUserId = searchUid.trim() || undefined;

      if (!email && !googleUserId) {
        setError("Masukkan email atau Google UID");
        return;
      }

      const [detail, nus1Res] = await Promise.all([
        getUserDetail(email, googleUserId),
        getUserNus1(email, googleUserId),
      ]);

      setUserDetail(detail);
      setNus1(nus1Res);

      if (detail.found) {
        setPromptYaml(buildFixPromptYaml(detail, nus1Res));
        setPromptMd(buildFixPrompt(detail, nus1Res));
      }
    } catch (e: any) {
      setError(e.message ?? "Gagal mencari user");
    } finally {
      setLoading(false);
    }
  }, [searchEmail, searchUid]);

  // ── Download .nus1 ──────────────────────────────────────────────────

  const downloadNus1 = useCallback(() => {
    if (!nus1?.nus1_base64 || !nus1?.nus1_file_name) return;

    // Decode base64 → bytes → download
    const binary = atob(nus1.nus1_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nus1.nus1_file_name!;
    a.click();
    URL.revokeObjectURL(url);
  }, [nus1]);

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

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Backup & Recovery</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cari user, download backup .nus1, dan generate prompt perbaikan.
        </p>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Cari User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Email (cth: user@gmail.com)"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Google UID (cth: 114275999320339813466)"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={searchUser}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Mencari..." : "Cari"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* ── User Detail ────────────────────────────────────────────── */}
      {userDetail && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Detail User</h3>

          {!userDetail.found ? (
            <p className="text-sm text-gray-500">{userDetail.message ?? "User tidak ditemukan"}</p>
          ) : (
            <>
              {/* Info cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{userDetail.email}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Google UID</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{userDetail.googleUserId}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Varian</div>
                  <div className="text-sm font-medium text-gray-900">{userDetail.product}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Lisensi</div>
                  <div className="text-sm font-medium text-gray-900">{userDetail.licenses_count}</div>
                </div>
              </div>

              {/* License + backup details */}
              {userDetail.records?.map((rec, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rec.license.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : rec.license.status === "Generated"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {rec.license.status}
                    </span>
                    <span className="text-xs text-gray-500">{rec.license.tier ?? "lifetime"}</span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono break-all">{rec.license.key}</div>
                  <div className="text-xs text-gray-500">
                    Backup: {rec.backup.exists ? `${(rec.backup.size_bytes / 1024 / 1024).toFixed(1)} MB` : "Tidak ada"} — {rec.backup.path}
                  </div>
                  <div className="text-xs text-gray-500">Aktivasi: {rec.activations.length} device</div>
                </div>
              ))}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {nus1?.found && nus1?.nus1_base64 && (
                  <button
                    onClick={downloadNus1}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:opacity-90"
                  >
                    Download .nus1 ({(nus1.nus1_size_bytes! / 1024 / 1024).toFixed(1)} MB)
                  </button>
                )}
                {promptYaml && (
                  <button
                    onClick={() => copyToClipboard(promptYaml, "yaml")}
                    className="px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-lg hover:opacity-90"
                  >
                    {copied === "yaml" ? "✓ Tersalin!" : "Copy Prompt (YAML)"}
                  </button>
                )}
                {promptMd && (
                  <button
                    onClick={() => copyToClipboard(promptMd, "md")}
                    className="px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-lg hover:opacity-90"
                  >
                    {copied === "md" ? "✓ Tersalin!" : "Copy Prompt (Detail)"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Prompt Preview ──────────────────────────────────────────── */}
      {promptYaml && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Prompt (copy-paste)</h3>
            <button
              onClick={() => copyToClipboard(promptYaml, "yaml2")}
              className="text-xs text-primary hover:underline"
            >
              {copied === "yaml2" ? "✓ Tersalin!" : "Copy"}
            </button>
          </div>
          <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
            {promptYaml}
          </pre>
        </div>
      )}

      {/* ── Export D1 ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Export Database (D1)</h3>
        <p className="text-xs text-gray-500">
          Download seluruh data Cloudflare D1 sebagai JSON (backup manual).
        </p>
        <button
          onClick={handleExportD1}
          disabled={d1Loading}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {d1Loading ? "Exporting..." : "Export D1 → JSON"}
        </button>
        {d1Status && <p className="text-xs text-gray-600">{d1Status}</p>}
      </div>
    </div>
  );
}
