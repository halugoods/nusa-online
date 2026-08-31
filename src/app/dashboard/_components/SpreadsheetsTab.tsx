"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchSheetsStatus,
  fetchOAuthStatus,
  fetchOAuthConsentUrl,
  submitOAuthCode,
  testSheetsCredential,
  listSheetsUsers,
  type SheetsRegistryUser,
  type SheetsTestResult,
  type SheetsOAuthStatus,
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
// 1. Hubungkan Google (company account): klik "Login Google" → paste code →
//    refresh token tersimpan di server. Server yang buat & isi spreadsheet.
// 2. Registry: semua user yang memakai fitur spreadsheet + link langsung.

export default function SpreadsheetsTab() {
  const [status, setStatus] = useState<SheetsOAuthStatus | null>(null);
  const [consentUrl, setConsentUrl] = useState("");
  const [codeDraft, setCodeDraft] = useState("");
  const [linking, setLinking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState("");
  const [testResult, setTestResult] = useState<SheetsTestResult | null>(null);

  const [users, setUsers] = useState<SheetsRegistryUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const reloadStatus = useCallback(async () => {
    try {
      setStatus(await fetchOAuthStatus());
    } catch (e: any) {
      setBusy(e.message);
    }
  }, []);

  useEffect(() => {
    reloadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleGetLoginUrl() {
    setBusy("");
    try {
      const url = await fetchOAuthConsentUrl();
      setConsentUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setBusy(e.message);
    }
  }

  async function handleLinkGoogle() {
    const code = codeDraft.trim();
    if (!code) {
      setBusy("Tempel dulu kode dari halaman Google.");
      return;
    }
    setLinking(true);
    setBusy("");
    setTestResult(null);
    try {
      const r = await submitOAuthCode(code);
      setCodeDraft("");
      setConsentUrl("");
      setBusy(
        r.owner_email
          ? `✅ Google terhubung sebagai ${r.owner_email}.`
          : "✅ Google terhubung."
      );
      await reloadStatus();
    } catch (e: any) {
      setBusy(e.message);
    }
    setLinking(false);
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

  const connected = status?.enabled === true;
  const showConsent = !!consentUrl && !connected;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Google Sheets (Company API)</h2>
        <p className="text-xs text-gray-500">
          Fitur spreadsheet NUSA: server membuat & mengisi spreadsheet laporan tiap user
          atas nama <span className="font-medium">akun Google company NUSA</span> (login
          sekali di sini) — app tidak perlu login Google. Semua user yang memakai fitur ini
          muncul di registry bawah, lengkap dengan link spreadsheet-nya.
        </p>
      </div>

      {/* ── Koneksi Google (company account) ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Koneksi Google (Company Account)</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Status:{" "}
              {status === null ? (
                <span className="text-gray-400">memuat…</span>
              ) : connected ? (
                <span className="text-green-600 font-medium">
                  ✅ Terhubung{status.owner_email ? ` · ${status.owner_email}` : ""}
                </span>
              ) : (
                <span className="text-amber-600 font-medium">⚠️ Belum terhubung</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !connected}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              {testing ? "Testing…" : "Test Koneksi"}
            </button>
            <button
              onClick={handleGetLoginUrl}
              disabled={linking || connected}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              Login Google
            </button>
          </div>
        </div>

        {!connected && (
          <div className="space-y-3">
            <ol className="list-decimal ml-5 text-xs text-gray-500 space-y-1">
              <li>
                Klik <b>Login Google</b> — tab baru terbuka ke halaman izin Google.
              </li>
              <li>
                Pilih akun <b>company NUSA</b> (mis.{" "}
                <span className="font-mono">nusabyhalugoodsindonesia@gmail.com</span>),
                izinkan akses.
              </li>
              <li>
                Browser diarahkan ke <span className="font-mono">127.0.0.1</span>{" "}
                (koneksi gagal — <b>itu normal</b>). Salin <b>kode</b> dari address bar
                (mulai <span className="font-mono">4/0…</span> atau{" "}
                <span className="font-mono">4%2F0…</span>), tempel di kotak bawah, lalu
                klik <b>Hubungkan</b>.
              </li>
            </ol>

            {showConsent && (
              <a
                href={consentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Buka halaman izin Google ↗
              </a>
            )}

            <input
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              placeholder="Tempel kode dari Google di sini…"
              className="w-full px-4 py-3 border border-input-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <button
              onClick={handleLinkGoogle}
              disabled={linking}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {linking ? "Menghubungkan…" : "Hubungkan Google"}
            </button>
          </div>
        )}

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

        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer font-medium text-gray-600 hover:text-primary">
            Cara menyiapkan Login Google (sekali saja)
          </summary>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>
              Pastikan 2 secret di-set di Supabase:{" "}
              <span className="font-mono">GOOGLE_OAUTH_CLIENT_ID</span> +{" "}
              <span className="font-mono">GOOGLE_OAUTH_CLIENT_SECRET</span>{" "}
              (dibuat di Google Cloud Console → APIs &amp; Services → Credentials →{" "}
              <b>OAuth Client ID</b> type <b>Desktop app</b>).
            </li>
            <li>
              Google Cloud Console → <b>OAuth consent screen</b> → status <b>Testing</b>{" "}
              (atau Publish) → tambahkan scope <b>…/auth/drive.file</b> → tambahkan email
              admin sebagai <b>Test user</b>.
            </li>
            <li>
              Jalankan migration <span className="font-mono">0021_sheets_oauth.sql</span> di
              Supabase SQL Editor (tambah kolom oauth di sheets_settings).
            </li>
            <li>
              Kembali ke sini: <b>Login Google</b> → paste kode → <b>Hubungkan</b>.
            </li>
          </ol>
          <p className="mt-2 text-[11px] text-gray-400">
            Spreadsheet user dibuat di Drive akun company ini, lalu di-share otomatis ke
            email Google user yang login di app — jadi muncul di Drive mereka.
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
