"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "628976280303";

const apps = [
  {
    id: "nusa-kelontong", name: "Kelontong", color: "#F97316", bg: "bg-orange-500",
    desc: "Toko sembako & kebutuhan sehari-hari",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
        <line x1="12" y1="14" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    id: "nusa-fnb", name: "F&B", color: "#E63946", bg: "bg-red-500",
    desc: "Restoran, cafe, warung makan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    id: "nusa-laundry", name: "Laundry", color: "#3B82F6", bg: "bg-blue-500",
    desc: "Cuci kiloan, satuan, express",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h12l4 8-4 12H6L2 10l4-8z" />
        <circle cx="12" cy="14" r="4" />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" />
        <line x1="8" y1="6" x2="8.01" y2="6" />
        <line x1="16" y1="6" x2="16.01" y2="6" />
      </svg>
    ),
  },
  {
    id: "nusa-bengkel", name: "Bengkel", color: "#374151", bg: "bg-gray-600",
    desc: "Servis motor, mobil, sparepart",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: "nusa-salon", name: "Salon", color: "#78716C", bg: "bg-stone-500",
    desc: "Salon, barbershop, treatment",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12A3 3 0 0112 6a3 3 0 012.12.88" />
        <path d="M9 9l-5 5 2 2 5-5" />
        <path d="M15 15l5 5-2 2-5-5" />
      </svg>
    ),
  },
  {
    id: "nusa-apotek", name: "Apotek", color: "#10B981", bg: "bg-emerald-500",
    desc: "Obat bebas, resep, alat kesehatan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 12h.01" />
        <path d="M17 12h.01" />
        <path d="M7 12h.01" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="17" cy="12" r="1" fill="currentColor" />
        <circle cx="7" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "nusa-fotocopy", name: "Fotocopy", color: "#8B5CF6", bg: "bg-violet-500",
    desc: "Print, fotocopy, jilid, ATK",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 12H4a2 2 0 00-2 2v4a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 00-2-2h-2" />
        <rect x="6" y="14" width="12" height="8" />
        <line x1="10" y1="17" x2="10" y2="19" />
        <line x1="14" y1="17" x2="14" y2="19" />
      </svg>
    ),
  },
  {
    id: "nusa-servis", name: "Servis", color: "#06B6D4", bg: "bg-cyan-500",
    desc: "Servis HP, elektronik & gadget",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <path d="M9 7h6" />
        <path d="M9 11h4" />
      </svg>
    ),
  },
];

const tiers = [
  {
    id: "trial",
    name: "Trial",
    price: "Gratis",
    period: "3 hari",
    desc: "Coba semua fitur tanpa risiko.",
    color: "border-amber-300",
    badge: "COBA DULU",
    badgeBg: "bg-amber-400",
    btnColor: "bg-amber-400 hover:bg-amber-500",
    shadow: "shadow-amber-400/20",
    features: ["Semua fitur tanpa batasan", "Toko online gratis", "Backup cloud", "Support WhatsApp"],
  },
  {
    id: "1month",
    name: "Bulanan",
    price: "Rp 49K",
    period: "1 bulan",
    desc: "Pas untuk kebutuhan jangka pendek. Pakai selama perlu, kapan pun bisa berhenti.",
    color: "border-blue-400",
    badge: "BULANAN",
    badgeBg: "bg-blue-500",
    btnColor: "bg-blue-500 hover:bg-blue-600",
    shadow: "shadow-blue-500/20",
    features: ["Semua fitur Trial", "Support prioritas", "Bisa perpanjang otomatis"],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "Rp 249K",
    period: "selamanya",
    desc: "Bayar sekali, pakai selamanya.",
    color: "border-primary",
    badge: "HEMAT 60%",
    badgeBg: "bg-red-500",
    btnColor: "bg-primary hover:bg-primary-dark",
    shadow: "shadow-primary/30",
    features: ["Semua fitur Bulanan", "Multi perangkat (1 akun Google)", "Update aplikasi gratis selamanya"],
  },
];

// Pro pricing tiers
const proTiers = [
  {
    id: "pro-trial",
    name: "Trial",
    price: "Gratis",
    period: "3 hari",
    desc: "Coba semua fitur Pro tanpa risiko.",
    color: "border-amber-300",
    badge: "COBA DULU",
    badgeBg: "bg-amber-400",
    btnColor: "bg-amber-400 hover:bg-amber-500",
    shadow: "shadow-amber-400/20",
    features: ["Semua fitur Pro", "Cloud backup", "AI Assistant", "Support WhatsApp"],
  },
  {
    id: "pro-monthly",
    name: "Bulanan",
    price: "Rp 99K",
    period: "1 bulan",
    desc: "Cloud-based. Sinkronisasi real-time di semua perangkat.",
    color: "border-blue-400",
    badge: "BULANAN",
    badgeBg: "bg-blue-500",
    btnColor: "bg-blue-500 hover:bg-blue-600",
    shadow: "shadow-blue-500/20",
    features: ["Semua fitur Trial", "Cloud sync real-time", "AI Assistant", "Multi cabang"],
  },
  {
    id: "pro-lifetime",
    name: "Lifetime",
    price: "Rp 499K",
    period: "selamanya",
    desc: "Bayar sekali, pakai selamanya. Termasuk update gratis.",
    color: "border-primary",
    badge: "BEST VALUE",
    badgeBg: "bg-gradient-to-r from-primary to-amber-500",
    btnColor: "bg-primary hover:bg-primary-dark",
    shadow: "shadow-primary/30",
    features: ["Semua fitur Bulanan", "Multi perangkat (Google Sign-In)", "Update gratis selamanya", "Priority support"],
  },
];

// Lite pricing tiers
const liteTiers = [
  {
    id: "lite-trial",
    name: "Trial",
    price: "Gratis",
    period: "3 hari",
    desc: "Coba semua fitur Lite tanpa risiko.",
    color: "border-amber-300",
    badge: "COBA DULU",
    badgeBg: "bg-amber-400",
    btnColor: "bg-amber-400 hover:bg-amber-500",
    shadow: "shadow-amber-400/20",
    features: ["Semua fitur Lite", "Offline-first", "Local backup", "Support WhatsApp"],
  },
  {
    id: "lite-monthly",
    name: "Bulanan",
    price: "Rp 49K",
    period: "1 bulan",
    desc: "Offline-first. Pakai tanpa internet setelah aktivasi.",
    color: "border-emerald-400",
    badge: "BULANAN",
    badgeBg: "bg-emerald-500",
    btnColor: "bg-emerald-500 hover:bg-emerald-600",
    shadow: "shadow-emerald-500/20",
    features: ["Semua fitur Trial", "Tanpa internet", "Aktivasi email + key", "Local storage"],
  },
  {
    id: "lite-lifetime",
    name: "Lifetime",
    price: "Rp 249K",
    period: "selamanya",
    desc: "Bayar sekali, pakai selamanya. Tanpa biaya bulanan.",
    color: "border-gray-400",
    badge: "HEMAT 60%",
    badgeBg: "bg-gray-600",
    btnColor: "bg-gray-700 hover:bg-gray-800",
    shadow: "shadow-gray-500/30",
    features: ["Semua fitur Bulanan", "Tanpa biaya bulanan", "Update gratis selamanya", "Email + license key"],
  },
];

const features = [
  {
    title: "Multi Kasir",
    desc: "Role-based access. Owner, Manager, Kasir, Gudang, Finance.",
    badge: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "Laporan Real-time",
    desc: "Pantau penjualan, stok, keuangan. Export ke spreadsheet.",
    badge: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: "Toko Online",
    desc: "Halaman toko online. Pelanggan pesan langsung via WhatsApp.",
    badge: "pro",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    title: "Backup Cloud",
    desc: "Data aman di cloud. Ganti HP tinggal restore.",
    badge: "pro",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9z" />
        <path d="M12 13v7" />
        <polyline points="9 17 12 20 15 17" />
      </svg>
    ),
  },
  {
    title: "Promo & Diskon",
    desc: "Diskon %, nominal, buy X get Y. Barcode scan produk.",
    badge: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    title: "QRIS & Barcode",
    desc: "Terima pembayaran QRIS. Scan barcode produk.",
    badge: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <line x1="14" y1="14" x2="14" y2="14.01" />
        <line x1="18" y1="14" x2="18" y2="14.01" />
        <line x1="14" y1="18" x2="14" y2="18.01" />
        <line x1="18" y1="18" x2="18" y2="18.01" />
        <line x1="18" y1="14" x2="21" y2="14" />
        <line x1="18" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
  {
    title: "Pelanggan & Supplier",
    desc: "Database pelanggan, supplier, hutang-piutang.",
    badge: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "AI Assistant",
    desc: "Tanya soal stok, penjualan, rekomendasi langsung di aplikasi.",
    badge: "pro",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

const steps = [
  { step: "1", title: "Pilih & Bayar", desc: "Pilih aplikasi & paket (Pro atau Lite), hubungi via WhatsApp, lakukan pembayaran. Key aktivasi dikirim ke email Anda dalam hitungan menit." },
  { step: "2", title: "Download & Aktivasi", desc: "Download aplikasi NUSA pilihan Anda dari link yang kami kirim. Pro: login dengan akun Google. Lite: masukkan email + license key (tanpa Google)." },
  { step: "3", title: "Setup & Mulai Jualan", desc: "Isi data bisnis, tambahkan produk atau layanan, dan langsung mulai mencatat transaksi pertama Anda." },
];

const faqs = [
  { q: "Apa itu NUSA?", a: "NUSA adalah aplikasi Point of Sale (POS) untuk berbagai jenis bisnis di Indonesia — dari toko kelontong, F&B, laundry, bengkel, salon, apotek, fotocopy, sampai servis HP. Pilih aplikasi yang sesuai dengan bisnis Anda, bayar lisensinya, dan langsung mulai jualan." },
  { q: "Berapa harganya?", a: "Tersedia 2 versi: NUSA Pro (Cloud) dengan Google Sign-In — Bulanan Rp 99K/bulan atau Lifetime Rp 499K. NUSA Lite (Offline) tanpa Google — Bulanan Rp 49K/bulan atau Lifetime Rp 249K. Keduanya ada Trial Gratis 3 hari. Pro termasuk AI Assistant, backup cloud, toko online & multi cabang." },
  { q: "Bisa punya lisensi untuk beberapa aplikasi NUSA?", a: "Ya. Satu akun Google (Pro) atau email (Lite) bisa punya lisensi berbeda untuk setiap aplikasi NUSA. Misalnya, Anda bisa punya NUSA Kelontong untuk toko sembako dan NUSA F&B untuk warung makan — semuanya dengan akun yang sama." },
  { q: "Ada trial gratisnya?", a: "Ada. Coba gratis 3 hari full fitur baik untuk Pro maupun Lite. Kalau cocok, tinggal beli lisensi. Kalau tidak cocok, tidak perlu bayar apa-apa." },
  { q: "Apakah butuh internet?", a: "NUSA Lite: tidak perlu internet setelah aktivasi — semua transaksi berjalan offline. NUSA Pro: perlu internet untuk sinkronisasi cloud, backup otomatis, dan fitur AI Assistant. Transaksi dasar tetap bisa offline dan akan sync saat online kembali." },
  { q: "Bisa dipakai di iPhone?", a: "Saat ini NUSA hanya tersedia di Android. Versi iOS sedang dalam pengembangan." },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("lifetime");
  const [pricingPlan, setPricingPlan] = useState<"pro" | "lite">("pro");

  const selectedAppData = apps.find((a) => a.id === selectedApp);
  const currentTiers = pricingPlan === "pro" ? proTiers : liteTiers;
  const selectedTierData = currentTiers.find((t) => t.id === selectedTier);

  const waBuyMsg = selectedAppData
    ? `Halo, saya mau beli NUSA ${selectedAppData.name} — paket ${selectedTierData?.name} ${pricingPlan === "pro" ? "(Pro Cloud)" : "(Lite Offline)"} (${selectedTierData?.price}).`
    : `Halo, saya mau beli NUSA ${pricingPlan === "pro" ? "Pro (Cloud)" : "Lite (Offline)"}. Bisa info pembayaran?`;

  const waTrialMsg = selectedAppData
    ? `Halo, saya mau coba trial gratis NUSA ${selectedAppData.name} 3 hari ${pricingPlan === "pro" ? "(Pro)" : "(Lite)"}.`
    : `Halo, saya mau coba trial gratis NUSA ${pricingPlan === "pro" ? "Pro" : "Lite"} 3 hari.`;

  const handlePlanSwitch = (plan: "pro" | "lite") => {
    setPricingPlan(plan);
    // Set appropriate default tier
    if (plan === "pro") {
      setSelectedTier("pro-lifetime");
    } else {
      setSelectedTier("lite-lifetime");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-gray-900 font-sans">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #F97316 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />

      {/* Gradient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-extrabold text-sm">N</span>
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight">NUSA</span>
          </a>
          <a href="#pricing" className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-primary/30">
            Beli Sekarang
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 pt-14 md:pt-24 pb-12 md:pb-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold text-xs px-3.5 py-1.5 rounded-full mb-6 border border-primary/20 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Aplikasi Kasir untuk Semua Jenis Bisnis
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-[56px] font-extrabold text-white leading-[1.1] mb-4 tracking-tight">
              Satu Ekosistem,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-400">Delapan Aplikasi Kasir</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Pilih aplikasi yang sesuai dengan bisnis Anda. Dari toko kelontong, restoran, laundry, bengkel, sampai salon — semuanya tersedia.
            </p>
            <p className="text-gray-500 text-sm md:text-base mb-8">
              <span className="inline-flex items-center gap-1.5 mr-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span>NUSA Pro (Cloud)</span>
              <span className="text-gray-600">•</span>
              <span className="inline-flex items-center gap-1.5 ml-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>NUSA Lite (Offline)</span>
            </p>
          </div>

          {/* App Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => { setSelectedApp(app.id); setSelectedTier(pricingPlan === "pro" ? "pro-lifetime" : "lite-lifetime"); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}
                className={`relative group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 backdrop-blur-sm ${
                  selectedApp === app.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10"
                }`}
              >
                {/* Pro Badge */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">PRO</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">LITE</span>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mt-1"
                  style={{ backgroundColor: `${app.color}20`, color: app.color }}
                >
                  <span className="w-6 h-6">{app.icon}</span>
                </div>
                <span className="font-bold text-white text-sm">{app.name}</span>
                <span className="text-[11px] text-gray-400 leading-tight text-center">{app.desc}</span>
                {selectedApp === app.id && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedApp && (
            <p className="text-center text-sm text-gray-400 mt-4 animate-fade-in">
              <strong className="text-white">NUSA {selectedAppData?.name}</strong> dipilih — scroll ke bawah untuk pilih paket
            </p>
          )}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 md:py-24 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">
              Fitur Lengkap di Semua Aplikasi
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              Setiap aplikasi NUSA dilengkapi fitur POS modern — tersedia di Pro dan Lite.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {features.map((f, i) => (
              <div key={i} className="group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 hover:bg-white/10 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
                {/* Badge */}
                <div className="absolute top-3 right-3">
                  {f.badge === "all" ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SEMUA</span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">PRO</span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                  <span className="w-5 h-5">{f.icon}</span>
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Comparison Table (Pro vs Lite) ─── */}
      <section className="py-20 md:py-24 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">
              NUSA Pro vs Lite
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              Bandingkan fitur antara NUSA Pro (Cloud) dan NUSA Lite (Offline). Pilih yang paling sesuai kebutuhan bisnis Anda.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fitur</span>
                <div className="text-center">
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">PRO</span>
                  <p className="text-xs font-semibold text-gray-300 mt-1">Cloud</p>
                </div>
                <div className="text-center">
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">LITE</span>
                  <p className="text-xs font-semibold text-gray-300 mt-1">Offline</p>
                </div>
              </div>
              {/* Table Rows */}
              {[
                { feature: "POS Kasir", pro: true, lite: true },
                { feature: "Laporan Real-time", pro: true, lite: true },
                { feature: "Backup Cloud", pro: true, lite: false },
                { feature: "AI Assistant", pro: true, lite: false },
                { feature: "Multi Cabang", pro: true, lite: false },
                { feature: "Toko Online", pro: true, lite: false },
                { feature: "Spreadsheet Export", pro: true, lite: false },
                { feature: "Google Sign-In", pro: true, lite: false },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 gap-4 px-6 py-3.5 ${i < 7 ? "border-b border-white/5" : ""}`}>
                  <span className="text-sm text-gray-300 font-medium">{row.feature}</span>
                  <div className="flex justify-center">
                    {row.pro ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {row.lite ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                </div>
              ))}
              {/* Pricing Row */}
              <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-primary/10 border-t border-primary/20">
                <span className="text-sm text-gray-200 font-bold">Harga Mulai</span>
                <div className="text-center">
                  <span className="text-sm font-extrabold text-primary">Rp 99K</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-extrabold text-emerald-400">Rp 49K</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 md:py-24 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">
              {selectedApp ? `Pilih Paket untuk NUSA ${selectedAppData?.name}` : "Pilih Aplikasi & Paket"}
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {selectedApp ? "Trial gratis 3 hari, atau langsung beli lisensi." : "Pilih aplikasi di atas, lalu pilih paket yang sesuai."}
            </p>
          </div>

          {/* Pro/Lite Toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center bg-white/5 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10">
              <button
                onClick={() => handlePlanSwitch("pro")}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  pricingPlan === "pro"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pro (Cloud)
              </button>
              <button
                onClick={() => handlePlanSwitch("lite")}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  pricingPlan === "lite"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Lite (Offline)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {currentTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-white/5 backdrop-blur-sm rounded-3xl border-2 ${tier.color} p-8 text-center shadow-lg hover:shadow-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                  selectedTier === tier.id ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-primary scale-[1.02]" : ""
                }`}
                onClick={() => setSelectedTier(tier.id)}
              >
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${tier.badgeBg} text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wide shadow-lg`}>
                  {tier.badge}
                </div>

                <div className="mt-2 mb-5">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{tier.price}</span>
                  <span className="text-gray-400 text-sm ml-1">/{tier.period}</span>
                </div>

                <p className="text-xs text-gray-400 mb-6">{tier.desc}</p>

                <ul className="space-y-3 mb-7 text-sm text-gray-300 text-left">
                  {tier.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    tier.id.includes("trial") ? waTrialMsg : waBuyMsg
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full ${tier.btnColor} text-white font-bold py-3 rounded-2xl shadow-lg ${tier.shadow} active:scale-[0.98] transition-all text-sm`}
                >
                  {tier.id.includes("trial") ? "Coba Gratis via WhatsApp" : "Beli via WhatsApp"}
                </a>

                <p className="text-[11px] text-gray-500 mt-3">Transfer bank / QRIS tersedia</p>
              </div>
            ))}
          </div>

          {!selectedApp && (
            <p className="text-center text-sm text-gray-500 mt-6">Pilih aplikasi dulu di bagian atas, lalu pilih paket di sini</p>
          )}
        </div>
      </section>

      {/* ─── Cara Aktivasi ─── */}
      <section className="py-20 md:py-24 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">Mulai dalam 3 Langkah</h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">Aktivasi NUSA sangat mudah dan cepat — tidak perlu teknisi.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {steps.map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  {item.step}
                </div>
                <h3 className="font-bold text-white mb-2.5">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 left-[65%] w-[70%]">
                    <svg viewBox="0 0 120 2" className="w-full h-0.5 text-gray-600" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4">
                      <line x1="0" y1="1" x2="120" y2="1" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 md:py-24 relative">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">Pertanyaan Umum</h2>
            <p className="text-gray-400 text-sm">Ada pertanyaan? Mungkin jawabannya sudah ada di sini.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden transition-all duration-200 hover:bg-white/10">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                >
                  <span className="font-semibold text-white text-sm pr-4">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 animate-fade-in">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Bottom ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-amber-600" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />
        <div className="max-w-2xl mx-auto px-4 text-center relative">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">
            Siap Mengelola Bisnis Lebih Modern?
          </h2>
          <p className="text-orange-100 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
            Hubungi kami sekarang dan dapatkan key aktivasi dalam hitungan menit. Tidak perlu ribet — semua via WhatsApp.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waBuyMsg)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-white hover:bg-gray-50 text-primary font-bold px-8 py-3.5 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-slate-950 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">N</span>
              </div>
              <span className="font-bold text-white text-sm">NUSA</span>
            </div>
            <p className="text-gray-500 text-xs text-center">
              &copy; {new Date().getFullYear()} NUSA — Aplikasi Kasir Indonesia. Semua hak dilindungi.
            </p>
            <div className="flex items-center gap-5 text-xs text-gray-500">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
              <a href="mailto:support@halugoods.com" className="hover:text-white transition-colors">Email</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
