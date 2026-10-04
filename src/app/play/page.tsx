"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface PlayApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  theme_color: string;
  dark_color: string;
  icon: string;
  package_name: string;
  latest_version: string;
  latest_build: number;
  installed_version: string | null;
  installed_build: number | null;
  has_update: boolean;
  is_up_to_date: boolean;
  min_build: number;
  download_url: string;
  file_size: string;
  release_date: string;
  changelog: string;
  has_license: boolean;
  license_key: string | null;
}

interface UserInfo {
  active_licenses_count: number;
  primary_key: string;
  customer_name: string;
  email: string;
}

const DEFAULT_VARIANTS: PlayApp[] = [
  {
    id: "nusa-kelontong",
    name: "NUSA Kelontong",
    tagline: "Kasir Toko Kelontong, Grosir, & Minimarket",
    description: "Mendukung barcode scanner, grosir bertingkat, stok menipis, hutang piutang, dan toko online.",
    theme_color: "#F97316",
    dark_color: "#EA580C",
    icon: "🛒",
    package_name: "com.nusa.kelontong",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-kelontong/releases/download/v2.2.57+164/nusa-kelontong-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-fnb",
    name: "NUSA FnB",
    tagline: "Kasir Resto, Kafe, Warung, & Kuliner",
    description: "Mendukung nomor meja, cetak dapur/bar, varian menu (level/topping), dan QRIS dinamis.",
    theme_color: "#E11D48",
    dark_color: "#BE123C",
    icon: "☕",
    package_name: "com.nusa.fnb",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-fnb/releases/download/v2.2.57+164/nusa-fnb-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-laundry",
    name: "NUSA Laundry",
    tagline: "Kasir Usaha Laundry Kiloan & Satuan",
    description: "Pelacakan status cuci (Antre/Cuci/Setrika/Selesai), nota nomor rak, dan notifikasi WA otomatis.",
    theme_color: "#6366F1",
    dark_color: "#4F46E5",
    icon: "🧺",
    package_name: "com.nusa.laundry",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-laundry/releases/download/v2.2.57+164/nusa-laundry-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-bengkel",
    name: "NUSA Bengkel",
    tagline: "Kasir Bengkel Motor, Mobil, & Sparepart",
    description: "Mencatat no polisi/kendaraan, jasa mekanik + sparepart terpisah, dan riwayat servis.",
    theme_color: "#2563EB",
    dark_color: "#1D4ED8",
    icon: "🔧",
    package_name: "com.nusa.bengkel",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-bengkel/releases/download/v2.2.57+164/nusa-bengkel-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-salon",
    name: "NUSA Salon",
    tagline: "Kasir Salon, Barbershop, & Spa",
    description: "Komisi capster/stylist per layanan, paket perawatan, booking jadwal, dan kartu member.",
    theme_color: "#EC4899",
    dark_color: "#DB2777",
    icon: "💇",
    package_name: "com.nusa.salon",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-salon/releases/download/v2.2.57+164/nusa-salon-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-apotek",
    name: "NUSA Apotek",
    tagline: "Kasir Apotek & Toko Obat",
    description: "Peringatan tanggal kadaluarsa (expired), nomor batch obat, resep dokter, dan stok aman.",
    theme_color: "#0891B2",
    dark_color: "#0E7490",
    icon: "💊",
    package_name: "com.nusa.apotek",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-apotek/releases/download/v2.2.57+164/nusa-apotek-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-fotocopy",
    name: "NUSA Fotocopy",
    tagline: "Kasir Usaha Percetakan, ATK, & Fotocopy",
    description: "Hitung harga per lembar/kertas, jilid/laminating, barang ATK grosir, dan form cetak order.",
    theme_color: "#7C3AED",
    dark_color: "#6D28D9",
    icon: "🖨️",
    package_name: "com.nusa.fotocopy",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-fotocopy/releases/download/v2.2.57+164/nusa-fotocopy-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
  {
    id: "nusa-servis",
    name: "NUSA Servis",
    tagline: "Kasir Servis HP, Komputer, & Elektronik",
    description: "Tanda terima servis barcode, status pengerjaan unit, biaya sparepart + jasa teknisi.",
    theme_color: "#059669",
    dark_color: "#047857",
    icon: "📱",
    package_name: "com.nusa.servis",
    latest_version: "2.2.57",
    latest_build: 164,
    installed_version: null,
    installed_build: null,
    has_update: false,
    is_up_to_date: false,
    min_build: 0,
    download_url: "https://github.com/halugoods/nusa-servis/releases/download/v2.2.57+164/nusa-servis-release.apk",
    file_size: "~52 MB",
    release_date: "2026-10-04",
    changelog: "Laba Tiap Transaksi, WhatsApp Sync Realtime, D1 Outbox Guard, dan Integrasi Toko Online.",
    has_license: false,
    license_key: null,
  },
];

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";
const STORAGE_KEY = "playnusa_license_key";

export default function PlayNusaPage() {
  const [licenseInput, setLicenseInput] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [apps, setApps] = useState<PlayApp[]>(DEFAULT_VARIANTS);
  const [selectedApp, setSelectedApp] = useState<PlayApp | null>(null);
  const [search, setSearch] = useState("");

  // Load key from localStorage or URL params
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const urlKey = q.get("key") || q.get("license") || "";
      const savedKey = urlKey || localStorage.getItem(STORAGE_KEY) || "";
      if (savedKey) {
        setLicenseInput(savedKey);
        verifyLicense(savedKey);
      }
    } catch (_) {}
  }, []);

  const verifyLicense = async (keyToVerify: string) => {
    const k = keyToVerify.trim().toUpperCase();
    if (!k) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${WORKER_URL}/api/app-ping/play_catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.authorized) {
        setAuthorized(true);
        setActiveKey(k);
        setUserInfo(data.user_info ?? null);
        if (Array.isArray(data.apps) && data.apps.length > 0) {
          setApps(data.apps);
        }
        try {
          localStorage.setItem(STORAGE_KEY, k);
        } catch (_) {}
      } else {
        setAuthorized(false);
        setErrorMsg(data.error || "Kunci lisensi tidak aktif atau tidak ditemukan.");
      }
    } catch (err: any) {
      setAuthorized(false);
      setErrorMsg("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    setActiveKey(null);
    setAuthorized(null);
    setUserInfo(null);
    setLicenseInput("");
    setApps(DEFAULT_VARIANTS);
  };

  const filteredApps = useMemo(() => {
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.tagline.toLowerCase().includes(search.toLowerCase())
    );
  }, [apps, search]);

  const updatesAvailableCount = useMemo(() => {
    return apps.filter((a) => a.has_update).length;
  }, [apps]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* ═══════ TOP HEADER ═══════ */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  PlayNUSA
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  STORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Hub Resmi Distribusi Aplikasi NUSA Kasir</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authorized && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {userInfo?.customer_name || activeKey}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors ml-1 font-semibold"
                  title="Ganti Lisensi"
                >
                  Keluar
                </button>
              </div>
            )}
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
            >
              Beranda
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN CONTENT CONTAINER ═══════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ═══════ HERO BANNER ═══════ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border border-slate-700/60 p-6 sm:p-10 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-4">
              <span>✨ Versi Terbaru v2.2.57+164 Live</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
              Download & Perbarui 8 Varian NUSA Kasir
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
              Akses instan seluruh varian aplikasi NUSA Kasir untuk merchant aktif. Sistem secara otomatis
              mendeteksi versi aplikasi di perangkat Anda dan menyediakan tombol update sekali klik.
            </p>

            {/* ═══════ AUTH / LICENSE VERIFIER BAR ═══════ */}
            {!authorized ? (
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-700 max-w-lg">
                <p className="text-xs font-bold text-slate-300 mb-2">
                  🔑 Masukkan Kunci Lisensi NUSA Anda untuk Mulai:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="Contoh: NUSA-XXXX-XXXX-XXXX"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 font-mono transition-colors"
                  />
                  <button
                    onClick={() => verifyLicense(licenseInput)}
                    disabled={loading || !licenseInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Cek...</span>
                      </>
                    ) : (
                      <span>Verifikasi</span>
                    )}
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-xs font-semibold text-rose-400 mt-2 flex items-center gap-1.5">
                    <span>⚠️</span> {errorMsg}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold">
                  <span>✅ Lisensi Aktif: {activeKey}</span>
                </div>
                {updatesAvailableCount > 0 && (
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-xl text-xs font-bold">
                    <span>🔄 {updatesAvailableCount} Aplikasi Membutuhkan Update</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ APP STORE SEARCH & FILTER BAR ═══════ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Katalog Aplikasi</h2>
            <p className="text-xs text-slate-400">8 Varian Usaha POS NUSA Kasir Berbasis Android</p>
          </div>

          <div className="relative max-w-xs">
            <input
              type="text"
              placeholder="Cari varian usaha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* ═══════ 8 APPS GRID ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredApps.map((app) => {
            const hasUpdate = app.has_update;
            const isUpToDate = app.is_up_to_date;

            return (
              <div
                key={app.id}
                className="group relative bg-slate-850 bg-slate-900/70 hover:bg-slate-850/90 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-xl overflow-hidden"
              >
                {/* Background Accent Top Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ background: app.theme_color }}
                />

                <div>
                  {/* Icon & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${app.theme_color}20, ${app.dark_color}40)`,
                        border: `1px solid ${app.theme_color}40`,
                      }}
                    >
                      {app.icon}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {hasUpdate && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
                          UPDATE TERSEDIA
                        </span>
                      )}
                      {isUpToDate && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          TERBARU ✓
                        </span>
                      )}
                      {!hasUpdate && !isUpToDate && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                          v{app.latest_version}+{app.latest_build}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="font-extrabold text-base text-white group-hover:text-orange-400 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-300 mt-1 line-clamp-1">
                    {app.tagline}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Device installed status badge */}
                  {app.installed_build !== null && app.installed_build > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Perangkat Anda:</span>
                      <span
                        className={`font-bold ${
                          hasUpdate ? "text-orange-400" : "text-emerald-400"
                        }`}
                      >
                        build +{app.installed_build}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Bottom */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Detail
                  </button>

                  {authorized ? (
                    <a
                      href={app.download_url}
                      download
                      className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        hasUpdate
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 shadow-orange-500/20"
                          : "bg-slate-700 hover:bg-slate-600 text-white"
                      }`}
                    >
                      <span>{hasUpdate ? "🚀 Update APK" : "📥 Unduh APK"}</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs text-center transition-colors"
                    >
                      Aktivasi Dulu
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ═══════ DETAIL APP MODAL ═══════ */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${selectedApp.theme_color}30, ${selectedApp.dark_color}50)`,
                  border: `1.5px solid ${selectedApp.theme_color}`,
                }}
              >
                {selectedApp.icon}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedApp.name}</h3>
                <p className="text-xs text-orange-400 font-semibold">{selectedApp.package_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Versi Terbaru: v{selectedApp.latest_version}+{selectedApp.latest_build} ({selectedApp.file_size})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedApp.description}</p>

            {/* Changelog Box */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Catatan Rilis (Changelog):
              </p>
              <p className="text-xs text-slate-200 leading-normal">{selectedApp.changelog}</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedApp(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition-colors"
              >
                Tutup
              </button>
              {authorized ? (
                <a
                  href={selectedApp.download_url}
                  download
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs text-center hover:opacity-95 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Unduh APK Sekarang
                </a>
              ) : (
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs text-center"
                >
                  Aktivasi Lisensi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
