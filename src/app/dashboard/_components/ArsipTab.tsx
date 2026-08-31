"use client";

// ─── Arsip Bulanan (cloud DINGIN Supabase) — dashboard nusa-online ───────
// Pisah dari tab Google Sheets berdasarkan FUNGSI (2 cloud):
//   * Google Sheets  = cloud panas realtime (bulan berjalan)
//   * Arsip Bulanan  = cloud dingin Supabase (bulan selesai, filter lama)
// Tombol "Arsipkan Bulan" = rotasi manual; cron otomatis jalan tanggal 2
// (01:00 WIB) via edge fn sheets-archive-cron. Idempotent — arsip ulang
// bulan yang sama TIDAK menduplikasi.

import { useState, useEffect, useCallback } from "react";
import {
  listSheetsUsers,
  listSheetsArchives,
  archiveSheetsMonth,
  type SheetsRegistryUser,
  type SheetsArchiveRow,
} from "@/lib/sheets-admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ArsipTab() {
  const [users, setUsers] = useState<SheetsRegistryUser[]>([]);
  const [archives, setArchives] = useState<SheetsArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [archiveUser, setArchiveUser] = useState("");
  const [archiveMonth, setArchiveMonth] = useState("");
  const [archiving, setArchiving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([
        listSheetsUsers().catch(() => [] as SheetsRegistryUser[]),
        listSheetsArchives().catch(() => [] as SheetsArchiveRow[]),
      ]);
      setUsers(u);
      setArchives(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill user_id dari registry (klik user → terisi otomatis)
  function pickUser(uid: string) {
    setArchiveUser(uid);
    setBusy(`user_id terisi dari registry — tinggal isi bulan (YYYY-MM).`);
  }

  async function handleArchiveMonth() {
    const uid = archiveUser.trim();
    const bulan = archiveMonth.trim();
    if (!uid || !/^\d{4}-\d{2}$/.test(bulan)) {
      setBusy("Isi user_id dan bulan format YYYY-MM (contoh: 2026-08).");
      return;
    }
    if (!confirm(
      `Arsip bulan ${bulan} untuk user ini?\n\n` +
      "Semua tab spreadsheet user di-BACKUP ke Supabase lalu DIHAPUS dari sheet " +
      "(bulan berikutnya mulai kosong). Arsip idempotent — jalan 2× tidak dobel."
    )) return;
    setArchiving(true);
    setBusy("");
    try {
      const r = await archiveSheetsMonth(uid, bulan);
      setBusy(`✅ ${r.message}`);
      await reload();
    } catch (e: any) {
      setBusy(`❌ ${e.message}`);
    }
    setArchiving(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Arsip Bulanan (Cloud Dingin)</h2>
        <p className="text-xs text-gray-500">
          Cloud KEDUA aplikasi: bulan berjalan hidup di <b>Google Sheets</b> (realtime),
          bulan yang sudah selesai turun ke <b>Supabase</b> di sini — spreadsheet tetap ramping,
          laporan lama tetap bisa dibuka. Cron otomatis jalan <b>tanggal 2, 01:00 WIB</b>;
          tombol di bawah untuk rotasi manual. Idempotent: arsip ulang bulan yang sama tidak dobel.
        </p>
      </div>

      {/* ── Rotasi manual ── */}
      <div className="bg-white rounded-2xl border border-input-border p-5 space-y-4">
        <p className="font-semibold text-gray-900 text-sm">Arsipkan Bulan (manual)</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={archiveUser}
            onChange={(e) => setArchiveUser(e.target.value)}
            placeholder="user_id (klik dari tabel registry bawah)"
            className="flex-1 min-w-[220px] px-3 py-2 border border-input-border rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <input
            value={archiveMonth}
            onChange={(e) => setArchiveMonth(e.target.value)}
            placeholder="YYYY-MM"
            className="w-28 px-3 py-2 border border-input-border rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <button
            onClick={handleArchiveMonth}
            disabled={archiving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-xs"
          >
            {archiving ? "Mengarsipkan…" : "Arsipkan Bulan"}
          </button>
          <button
            onClick={reload}
            className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-primary bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
        {busy && (
          <p className="text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-700">{busy}</p>
        )}
      </div>

      {/* ── Tabel arsip ── */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Riwayat Arsip</h3>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Memuat…</div>
        ) : archives.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            Belum ada arsip bulanan.
            <br />
            <span className="text-xs text-gray-300">
              Cron otomatis mengarsipkan bulan selesai pada tanggal 2 tiap bulan (01:00 WIB).
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Bulan</th>
                    <th className="px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Tab</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Baris</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Diarsipkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {archives.map((a, i) => (
                    <tr key={`${a.user_id}-${a.bulan}-${a.tab}-${i}`} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-mono text-gray-700">{a.bulan}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs truncate max-w-[180px]" title={a.user_id}>
                        {a.user_id}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{a.tab}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{a.row_count}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDate(a.archived_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Registry ringkas (sumber klik user_id) ── */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Registry User <span className="text-xs font-normal text-gray-400">(klik user_id untuk isi form arsip)</span></h3>
        {users.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            Belum ada user.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">User / Toko</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Varian</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">user_id</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <p className="text-gray-800">{u.store_name || u.email || "—"}</p>
                        <p className="text-[11px] text-gray-400">{u.email || ""}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{u.variant || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => pickUser(u.user_id)}
                          className="px-2 py-1 text-[11px] font-mono text-gray-500 hover:text-primary bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          title={u.user_id}
                        >
                          {u.user_id.slice(0, 12)}…
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
