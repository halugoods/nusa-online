"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchSheetsStatus,
  saveSheetsCredential,
  testSheetsCredential,
  listSheetsUsers,
  type SheetsRegistryUser,
  type SheetsTestResult,
} from "@/lib/sheets-admin";
import { PRODUCTS } from "@/lib/license-manager";

function variantName(variant: string | null): string {
  if (!variant) return "—";
  return PRODUCTS.find((p) => p.id === variant)?.name ?? variant;
}

function statusBadge(status: string): { bg: string; label: string } {
  switch (status) {
    case "ready":
      return { bg: "bg-green-50 text-green-700 border-green-200", label: "Siap" };
    case "pending":
      return { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Proses" };
    case "error":
      return { bg: "bg-red-50 text-red-700 border-red-200", label: "Error" };
    default:
      return { bg: "bg-gray-50 text-gray-600 border-gray-200", label: status };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Tab Spreadsheet — dashboard nusa-online ─────────────────────────────
// 1. Konfigurasi: admin paste service account JSON NUSA + Simpan & Test.
// 2. Registry: semua user yang memakai fitur spreadsheet + link langsung.

export default function SpreadsheetsTab() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [jsonDraft, setJsonDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState("");
  const [testResult, setTestResult] = useState<SheetsTestResult | null>(null);

  const [users, setUsers] = useState<SheetsRegistryUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    fetchSheetsStatus().then((s) => setEnabled(s.enabled));
  }, []);

  const reloadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      setUsers(await listSheetsUsers());
    } catch (e: any) {
      setBusy(e.message);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    reloadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!jsonDraft.trim()) {
      setBusy("Tempel dulu service account JSON-nya.");
      return;
    }
    setSaving(true);
    setBusy("");
    setTestResult(null);
    try {
      await saveSheetsCredential(jsonDraft.trim());
      setEnabled(true);
      setBusy("✅ Kredensial service account tersimpan. Test koneksi untuk memastikan.");
    } catch (e: any) {
      setBusy(e.message);
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setBusy("");
    setTestResult(null);
    try {
      const r = await testSheetsCredential();
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Google Sheets (Company API)</h2>
        <p className="text-xs text-gray-500">
          Fitur spreadsheet NUSA: server membuat & mengisi spreadsheet laporan tiap user
          atas nama <span className="font-medium">service account</span> milik NUSA —
          app tidak perlu login Google lagi. Semua user yang memakai fitur ini muncul
          di registry bawah, lengkap dengan link spreadsheet-nya.
        </p>
      </div>

      {/* ── Konfigurasi kredensial ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Kredensial Service Account</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Status:{" "}
              {enabled === null ? (
                <span className="text-gray-400">memuat…</span>
              ) : enabled ? (
                <span className="text-green-600 font-medium">✅ Aktif</span>
              ) : (
                <span className="text-amber-600 font-medium">⚠️ Belum dikonfigurasi</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !enabled}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              {testing ? "Testing…" : "Test Koneksi"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? "Menyimpan…" : "Simpan Kredensial"}
            </button>
          </div>
        </div>

        <textarea
          value={jsonDraft}
          onChange={(e) => setJsonDraft(e.target.value)}
          rows={6}
          placeholder='Tempel isi file service account JSON di sini ({"type":"service_account","project_id":...,"client_email":...,"private_key":...})'
          className="w-full px-4 py-3 border border-input-border rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />

        {busy && (
          <p className="text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-700">{busy}</p>
        )}

        {testResult && (
          <div
            className={`px-3 py-2 rounded-lg text-sm ${
              testResult.ok
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {testResult.ok
              ? `✅ ${testResult.message}${testResult.latency_ms != null ? ` (${testResult.latency_ms}ms)` : ""}`
              : `❌ ${testResult.message}`}
            {testResult.url && (
              <a
                href={testResult.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-primary underline break-all"
              >
                {testResult.url}
              </a>
            )}
          </div>
        )}

        {/* Panduan setup */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer font-medium text-gray-600 hover:text-primary">
            Cara membuat service account JSON
          </summary>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Buka <a className="text-primary underline" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud Console</a> → buat/pilih project (mis. "nusa-sheets").</li>
            <li>APIs &amp; Services → Library → aktifkan <b>Google Sheets API</b> dan <b>Google Drive API</b>.</li>
            <li>IAM &amp; Admin → Service Accounts → <b>Create service account</b>.</li>
            <li>Klik akun yang dibuat → <b>Keys</b> → <b>Add Key</b> → <b>Create new key</b> → pilih <b>JSON</b> → file ter-download.</li>
            <li>Buka file JSON-nya, salin semua isinya, tempel di kotak di atas, lalu <b>Simpan</b> &amp; <b>Test Koneksi</b>.</li>
          </ol>
          <p className="mt-2 text-[11px] text-gray-400">
            Spreadsheet user dibuat di Drive service account ini (tidak terlihat di akun Google manapun),
            lalu di-share otomatis ke email Google user yang login di app — jadi muncul di Drive mereka.
          </p>
        </details>
      </div>

      {/* ── Registry user ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Registry Pengguna Spreadsheet</h3>
          <button
            onClick={reloadUsers}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {usersLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Memuat…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            Belum ada user yang memakai fitur spreadsheet.
            <br />
            <span className="text-xs text-gray-300">Begitu user membuka fitur di app, dia muncul di sini.</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">User / Email</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Toko</th>
                    <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Varian</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Terakhir Sync</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Spreadsheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const badge = statusBadge(u.status);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{u.email || "—"}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]" title={u.user_id}>
                            {u.user_id}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.store_name || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          {variantName(u.variant)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          {u.status === "error" && u.error && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={u.error}>
                              {u.error}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                          {formatDate(u.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.spreadsheet_url ? (
                            <a
                              href={u.spreadsheet_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                            >
                              Buka Spreadsheet ↗
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
