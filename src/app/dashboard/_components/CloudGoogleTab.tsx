"use client";

// ─── Cloud Google (backup data user → Google Drive) — dashboard ──────────
// TAB TERPISAH dari Google Sheets (arsitektur 2-cloud FINAL):
//   * Google Sheets = spreadsheet laporan user (akun nusabyhalugoods…)
//   * Cloud Google  = backup SQLite user di Drive (akun TERPISAH, admin add
//     sendiri) + arsip bulanan (rotasi sheet) digabung di sini.
// Migrasi: copy backup lama dari bucket Supabase nusa-backups → Drive
// (sekali jalan per user / semua user). Backup baru: app upload ke Supabase
// seperti biasa (dobel) + server copy ke Drive otomatis.

import { useState, useEffect, useCallback } from "react";
import {
  fetchDriveConsentUrl,
  submitDriveAccountCode,
  listDriveAccounts,
  revokeDriveAccount,
  listDriveRegistry,
  migrateDriveUser,
  migrateDriveAll,
  formatBytes,
  type DriveAccount,
  type DriveRegistryRow,
  type MigrateAllResult,
} from "@/lib/cloud-google";
import {
  listSheetsUsers,
  listSheetsArchives,
  archiveSheetsMonth,
  type SheetsRegistryUser,
  type SheetsArchiveRow,
} from "@/lib/sheets-admin";
import { PRODUCTS } from "@/lib/license-manager";

function variantName(variant: string | null): string {
  if (!variant) return "—";
  return PRODUCTS.find((p) => p.id === variant)?.name ?? variant;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CloudGoogleTab() {
  // Akun Drive
  const [accounts, setAccounts] = useState<DriveAccount[] | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountCode, setAccountCode] = useState("");
  const [accountLabel, setAccountLabel] = useState("");

  // Registry
  const [registry, setRegistry] = useState<DriveRegistryRow[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);

  // Migrasi
  const [migratingAll, setMigratingAll] = useState(false);
  const [migrateResult, setMigrateResult] = useState<MigrateAllResult | null>(null);
  const [busyUser, setBusyUser] = useState("");

  // Arsip bulanan (pindahan dari ArsipTab)
  const [sheetsUsers, setSheetsUsers] = useState<SheetsRegistryUser[]>([]);
  const [archives, setArchives] = useState<SheetsArchiveRow[]>([]);
  const [archiveUser, setArchiveUser] = useState("");
  const [archiveMonth, setArchiveMonth] = useState("");
  const [archiving, setArchiving] = useState(false);

  const [busy, setBusy] = useState("");

  const reloadAccounts = useCallback(async () => {
    try {
      setAccounts(await listDriveAccounts());
    } catch {
      // Migration 0024 belum dijalankan → tabel drive_accounts belum ada.
      setAccounts(null);
    }
  }, []);

  const reloadRegistry = useCallback(async () => {
    setRegistryLoading(true);
    try {
      setRegistry(await listDriveRegistry());
    } catch {
      setRegistry([]);
    }
    setRegistryLoading(false);
  }, []);

  const reloadArsip = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([
        listSheetsUsers().catch(() => [] as SheetsRegistryUser[]),
        listSheetsArchives().catch(() => [] as SheetsArchiveRow[]),
      ]);
      setSheetsUsers(u);
      setArchives(a);
    } catch {
      // diam — arsip opsional
    }
  }, []);

  useEffect(() => {
    reloadAccounts();
    reloadRegistry();
    reloadArsip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddAccount() {
    const code = accountCode.trim();
    if (!code) {
      setBusy("Tempel dulu kode dari halaman Google (login dengan akun Drive khusus).");
      return;
    }
    setAddingAccount(true);
    setBusy("");
    try {
      const r = await submitDriveAccountCode(code, accountLabel.trim() || undefined);
      setAccountCode("");
      setAccountLabel("");
      setBusy(`✅ ${r.email ? `${r.email} terhubung.` : "Akun Drive terhubung."}`);
      await reloadAccounts();
    } catch (e: any) {
      setBusy(e.message);
    }
    setAddingAccount(false);
  }

  async function handleRevokeAccount(id: string, email: string) {
    if (!confirm(`Nonaktifkan akun ${email}? Backup tidak hilang, tapi akun ini tidak dipakai lagi.`)) return;
    setBusy("");
    try {
      await revokeDriveAccount(id);
      setBusy(`✅ Akun ${email} dinonaktifkan.`);
      await reloadAccounts();
    } catch (e: any) {
      setBusy(e.message);
    }
  }

  async function handleMigrateUser(uid: string, variant: string) {
    setBusyUser(`${uid}|${variant}`);
    setBusy("");
    try {
      const r = await migrateDriveUser(uid);
      setBusy(r.ok ? `✅ ${uid}: backup tersalin ke Drive.` : `⚠️ ${uid}: dilewati (belum ada backup).`);
      await reloadRegistry();
    } catch (e: any) {
      setBusy(`❌ ${uid}: ${e.message}`);
    }
    setBusyUser("");
  }

  async function handleMigrateAll() {
    if (!confirm("Migrasi SEMUA backup user dari Supabase ke Google Drive? Backup besar bisa memakan waktu beberapa menit.")) return;
    setMigratingAll(true);
    setMigrateResult(null);
    setBusy("");
    try {
      const r = await migrateDriveAll();
      setMigrateResult(r);
      setBusy(`✅ Migrasi selesai: ${r.copied} berhasil, ${r.failed} gagal.`);
      await reloadRegistry();
    } catch (e: any) {
      setBusy(e.message);
    }
    setMigratingAll(false);
  }

  async function handleArchive() {
    if (!archiveUser.trim() || !/^\d{4}-\d{2}$/.test(archiveMonth.trim())) {
      setBusy("Isi user_id dan bulan format YYYY-MM.");
      return;
    }
    if (!confirm(`Arsipkan bulan ${archiveMonth} untuk user ${archiveUser}? Tab di spreadsheet akan dikosongkan setelah data aman tersimpan.`)) return;
    setArchiving(true);
    setBusy("");
    try {
      const r = await archiveSheetsMonth(archiveUser.trim(), archiveMonth.trim());
      setBusy(`✅ ${r.message}`);
      await reloadArsip();
    } catch (e: any) {
      setBusy(e.message);
    }
    setArchiving(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Cloud Google (Backup Data User)</h2>
        <p className="text-xs text-gray-500">
          Backup SQLite tiap user disimpan di <b>Google Drive</b> akun company khusus
          (TERPISAH dari akun spreadsheet). App tetap upload ke Supabase (dobel/fallback);
          server menyalin backup terbaru ke Drive otomatis. Gunakan menu
          <b> Migrasi</b> untuk menyalin backup user yang sudah ada.
        </p>
      </div>

      {busy && (
        <div className="text-sm px-4 py-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
          {busy}
        </div>
      )}

      {/* ── Akun Google Drive ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Akun Google Drive</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Akun KHUSUS backup (jangan akun spreadsheet). Max 50 user/akun — pas penuh, add akun baru.
            </p>
          </div>
        </div>

        {accounts === null ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Tabel <span className="font-mono">drive_accounts</span> belum ada — jalankan migration{" "}
            <span className="font-mono">0024_drive_cloud.sql</span> di Supabase SQL Editor dulu.
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-xs text-gray-500">Belum ada akun Drive terhubung. Tambahkan di bawah.</div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.email}
                    {!a.enabled && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        Nonaktif
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.users}/{a.max_users} user{a.label ? ` · ${a.label}` : ""} · diperbarui {formatDate(a.updated_at)}
                  </p>
                </div>
                {a.enabled && (
                  <button
                    onClick={() => handleRevokeAccount(a.id, a.email)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                  >
                    Nonaktifkan
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add akun (paste-code flow, pola sama dengan Sheets) */}
        <details className="text-sm">
          <summary className="cursor-pointer text-primary font-medium select-none">
            + Tambah Akun Google Drive Baru
          </summary>
          <div className="mt-3 space-y-3">
            <ol className="list-decimal ml-5 text-xs text-gray-500 space-y-1">
              <li>
                Klik{" "}
                <button
                  onClick={async () => {
                    try {
                      const url = await fetchDriveConsentUrl();
                      window.open(url, "_blank", "noopener,noreferrer");
                    } catch (e: any) {
                      setBusy(e.message);
                    }
                  }}
                  className="text-primary font-medium underline"
                >
                  buka halaman izin Google
                </button>{" "}
                — login dengan <b>akun Google khusus backup</b>.
              </li>
              <li>
                Browser diarahkan ke <span className="font-mono">127.0.0.1</span> (gagal koneksi —{" "}
                <b>itu normal</b>). Salin <b>kode</b> dari address bar (mulai{" "}
                <span className="font-mono">4/0…</span>).
              </li>
              <li>Tempel kodenya di bawah → Tambah Akun.</li>
            </ol>
            <div className="flex gap-2 flex-wrap">
              <input
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="Tempel kode 4/0… di sini"
                className="flex-1 min-w-56 px-3 py-2 border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder="Label (opsional)"
                className="w-40 px-3 py-2 border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleAddAccount}
                disabled={addingAccount}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {addingAccount ? "Menyambungkan…" : "Tambah Akun"}
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* ── Migrasi dari Supabase ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Migrasi Backup Lama (Supabase → Drive)</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Salin semua backup user yang sudah ada di bucket{" "}
              <span className="font-mono">nusa-backups</span> ke Google Drive. Sekali jalan — backup baru
              otomatis tersalin saat user sinkron.
            </p>
          </div>
          <button
            onClick={handleMigrateAll}
            disabled={migratingAll || !accounts || accounts.length === 0}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {migratingAll ? "Memigrasi…" : "Migrasi Semua User"}
          </button>
        </div>
        {migrateResult && (
          <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 max-h-60 overflow-auto">
            <p className="font-medium mb-1">
              Hasil: {migrateResult.copied} berhasil · {migrateResult.failed} gagal
            </p>
            {Object.entries(migrateResult.results).map(([uid, variants]) => (
              <p key={uid} className="truncate">
                <span className="font-mono">{uid.slice(0, 16)}…</span>
                {": "}
                {Object.entries(variants)
                  .map(([v, r]) => `${v} ${r.ok ? "✓" : `✗ ${r.error ?? ""}`}`)
                  .join(", ")}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Registry Backup ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-semibold text-gray-900 text-sm">Registry Backup (drive_registry)</p>
          <button
            onClick={reloadRegistry}
            className="text-xs text-primary font-medium hover:underline"
          >
            Refresh
          </button>
        </div>
        {registryLoading ? (
          <p className="text-xs text-gray-400">Memuat…</p>
        ) : registry.length === 0 ? (
          <p className="text-xs text-gray-500">
            Belum ada backup yang tersalin ke Drive. Jalankan <b>Migrasi Semua User</b> di atas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">User ID</th>
                  <th className="py-2 pr-3">Varian</th>
                  <th className="py-2 pr-3">Ukuran</th>
                  <th className="py-2 pr-3">Terakhir Upload</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {registry.map((r, i) => (
                  <tr key={`${r.user_id}-${r.variant}-${i}`} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-mono text-xs max-w-40 truncate" title={r.user_id}>
                      {r.user_id}
                    </td>
                    <td className="py-2 pr-3">{variantName(r.variant)}</td>
                    <td className="py-2 pr-3">{formatBytes(r.last_size_bytes)}</td>
                    <td className="py-2 pr-3 text-xs">{formatDate(r.last_uploaded_at)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          r.status === "ready"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : r.status === "error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 space-x-2 whitespace-nowrap">
                      {r.drive_link && (
                        <a
                          href={r.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          Buka
                        </a>
                      )}
                      <button
                        onClick={() => handleMigrateUser(r.user_id, r.variant)}
                        disabled={busyUser !== ""}
                        className="text-xs text-gray-500 hover:text-gray-800 font-medium disabled:opacity-40"
                      >
                        {busyUser === `${r.user_id}|${r.variant}` ? "…" : "Re-sync"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Arsip Bulanan (pindahan dari tab Arsip) ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Arsip Bulanan Spreadsheet (cold tier Supabase)</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Rotasi data sheet panas → Supabase. Cron otomatis tanggal 2 (01:00 WIB); tombol di bawah untuk
            arsip manual. Idempotent — arsip ulang bulan yang sama TIDAK menduplikasi.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={archiveUser}
            onChange={(e) => setArchiveUser(e.target.value)}
            placeholder="user_id"
            className="flex-1 min-w-56 px-3 py-2 border border-input-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={archiveMonth}
            onChange={(e) => setArchiveMonth(e.target.value)}
            placeholder="YYYY-MM"
            className="w-28 px-3 py-2 border border-input-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {archiving ? "Mengarsipkan…" : "Arsipkan Bulan"}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Klik user_id di bawah untuk mengisi form:{" "}
          {sheetsUsers.slice(0, 10).map((u) => (
            <button
              key={u.user_id}
              onClick={() => setArchiveUser(u.user_id)}
              className="font-mono text-primary hover:underline mr-2"
            >
              {u.email || `${u.user_id.slice(0, 10)}…`}
            </button>
          ))}
        </p>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Riwayat Arsip ({archives.length})</p>
          {archives.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada arsip.</p>
          ) : (
            <div className="max-h-60 overflow-auto border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 px-3">Bulan</th>
                    <th className="py-2 px-3">Tab</th>
                    <th className="py-2 px-3">Baris</th>
                    <th className="py-2 px-3">Diarsipkan</th>
                  </tr>
                </thead>
                <tbody>
                  {archives.map((a) => (
                    <tr key={`${a.user_id}-${a.bulan}-${a.tab}`} className="border-b border-gray-50">
                      <td className="py-1.5 px-3 font-mono">{a.bulan}</td>
                      <td className="py-1.5 px-3">{a.tab}</td>
                      <td className="py-1.5 px-3">{a.row_count}</td>
                      <td className="py-1.5 px-3 text-gray-400">{formatDate(a.archived_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
