"use client";

import React, { useState, useEffect, useRef } from "react";

const WHATSAPP_NUMBER = "628976280303";

interface VariantApp {
  id: string;
  name: string;
  category: string;
  color: string;
  lightBg: string;
  borderCol: string;
  tagline: string;
  desc: string;
  specialFeatures: { title: string; desc: string }[];
  screens: {
    pos: { item: string; qty: string; price: string }[];
    stat: { label: string; val: string }[];
  };
}

const apps: VariantApp[] = [
  {
    id: "nusa-kelontong",
    name: "Kelontong",
    category: "Retail & Grosir",
    color: "#F97316",
    lightBg: "bg-orange-50",
    borderCol: "border-orange-200",
    tagline: "Kasir Cepat Sembako, Grosir & Rentengan",
    desc: "Dirancang untuk ritel volume tinggi. Multi-satuan (pcs/dus/renteng), scan barcode cepat, dan cetak label rak.",
    specialFeatures: [
      { title: "Multi-Satuan Dinamis", desc: "1 Dus isi 24 pcs otomatis potong stok proporsional saat kasir input." },
      { title: "Cetak Barcode Label", desc: "Mendukung printer TSPL & ESC/POS untuk label harga rak akurat." },
      { title: "Hutang & Jatuh Tempo", desc: "Catat kasbon pelanggan dengan rekam riwayat pelunasan otomatis." },
    ],
    screens: {
      pos: [
        { item: "Minyak Goreng 2L", qty: "2 pch", price: "Rp 68.000" },
        { item: "Beras Rojolele 5kg", qty: "1 sak", price: "Rp 74.000" },
        { item: "Gula Pasir 1kg", qty: "3 bks", price: "Rp 51.000" },
      ],
      stat: [
        { label: "Omzet Hari Ini", val: "Rp 4.850.000" },
        { label: "Transaksi", val: "84 Struk" },
        { label: "Laba Bersih", val: "Rp 680.000" },
      ],
    },
  },
  {
    id: "nusa-fnb",
    name: "F&B / Resto",
    category: "Kuliner & Cafe",
    color: "#E63946",
    lightBg: "bg-red-50",
    borderCol: "border-red-200",
    tagline: "Manajemen Meja, Dapur & Split Bill",
    desc: "Solusi lengkap cafe & resto: open bill, cetak tiket dapur terpisah, split bill per pelanggan, dan varian menu (topping/level).",
    specialFeatures: [
      { title: "Split Bill & Meja", desc: "Pisahkan pembayaran per orang dalam satu meja dengan hitungan presisi." },
      { title: "Tiket Order Dapur", desc: "Otomatis kirim struk ke printer dapur & bar tanpa lewat kasir utama." },
      { title: "Varian & Opsi Menu", desc: "Level pedas, extra shot, es/panas dengan penyesuaian harga instan." },
    ],
    screens: {
      pos: [
        { item: "Kopi Susu Gula Aren", qty: "3 cup", price: "Rp 54.000" },
        { item: "Nasi Goreng Spesial", qty: "2 porsi", price: "Rp 56.000" },
        { item: "French Fries BBQ", qty: "1 porsi", price: "Rp 22.000" },
      ],
      stat: [
        { label: "Omzet Hari Ini", val: "Rp 3.920.000" },
        { label: "Meja Aktif", val: "12 / 18" },
        { label: "Avg Ticket", val: "Rp 78.400" },
      ],
    },
  },
  {
    id: "nusa-servis",
    name: "Servis",
    category: "Reparasi Gadget & Elektronik",
    color: "#06B6D4",
    lightBg: "bg-cyan-50",
    borderCol: "border-cyan-200",
    tagline: "Tracking Nota Servis & Sparepart",
    desc: "Pantau pengerjaan unit HP, laptop & elektronik dari terima barang, estimasi biaya, tracking pengerjaan teknisi, hingga unit diambil.",
    specialFeatures: [
      { title: "Status Pengerjaan Realtime", desc: "Status Antri, Dikerjakan, Tunggu Part, hingga Siap Ambil terpantau rapi." },
      { title: "HPP Jasa vs Sparepart", desc: "Pisahkan laba murni biaya jasa teknisi dengan modal suku cadang." },
      { title: "Nota & Tanda Terima", desc: "Cetak nota terima unit lengkap nomor seri, keluhan, dan kelengkapan." },
    ],
    screens: {
      pos: [
        { item: "Ganti LCD Samsung A52", qty: "1 unit", price: "Rp 450.000" },
        { item: "Jasa Servis IC Power", qty: "1 unit", price: "Rp 200.000" },
        { item: "Tempered Glass King", qty: "1 pcs", price: "Rp 35.000" },
      ],
      stat: [
        { label: "Unit Masuk", val: "9 Device" },
        { label: "Siap Ambil", val: "6 Device" },
        { label: "Pendapatan Jasa", val: "Rp 1.450.000" },
      ],
    },
  },
  {
    id: "nusa-laundry",
    name: "Laundry",
    category: "Jasa Kiloan & Satuan",
    color: "#3B82F6",
    lightBg: "bg-blue-50",
    borderCol: "border-blue-200",
    tagline: "Timbang Kiloan, Tag Rak & Notif WA",
    desc: "Operasional laundry cepat: timbang bobot desimal, tandai nomor rak penyimpanan baju, dan lacak status cuci/setrika/packing.",
    specialFeatures: [
      { title: "Input Bobot Presisi", desc: "Mendukung pecahan desimal (misal 3.75 kg) dengan perhitungan otomatis." },
      { title: "Label Rak & Antrian", desc: "Cetak nomor tag rak pakaian agar tidak tertukar saat customer ambil." },
      { title: "Paket Berlangganan", desc: "Kelola kuota deposit laundry kiloan prabayar per pelanggan." },
    ],
    screens: {
      pos: [
        { item: "Cuci Komplit Express", qty: "4.5 kg", price: "Rp 45.000" },
        { item: "Bedcover King Size", qty: "1 pcs", price: "Rp 35.000" },
        { item: "Jas Formal Pria", qty: "1 stel", price: "Rp 25.000" },
      ],
      stat: [
        { label: "Total Bobot", val: "142.5 Kg" },
        { label: "Selesai Siap Ambil", val: "18 Nota" },
        { label: "Omzet Hari Ini", val: "Rp 1.280.000" },
      ],
    },
  },
  {
    id: "nusa-bengkel",
    name: "Bengkel",
    category: "Otomotif & Motor/Mobil",
    color: "#475569",
    lightBg: "bg-slate-100",
    borderCol: "border-slate-300",
    tagline: "Catat Plat Nomor, Jasa Montir & Part",
    desc: "Sistem kasir bengkel motor & mobil: rekam riwayat servis berdasarkan nomor polisi, hitung bagi hasil mekanik, dan kelola stok oli/sparepart.",
    specialFeatures: [
      { title: "Database No. Polisi", desc: "Ketik plat nomor untuk melihat riwayat penggantian part & oli sebelumnya." },
      { title: "Komisi Mekanik", desc: "Otomatis hitung insentif jasa mekanik per pengerjaan tanpa rekap manual." },
      { title: "Peringatan Stok Tipis", desc: "Notifikasi otomatis saat oli mesin atau fast-moving part menipis." },
    ],
    screens: {
      pos: [
        { item: "Oli Mesin MPX2 0.8L", qty: "1 btl", price: "Rp 58.000" },
        { item: "Jasa Tune Up & Injeksi", qty: "1 mtr", price: "Rp 45.000" },
        { item: "Kampas Rem Depan", qty: "1 set", price: "Rp 38.000" },
      ],
      stat: [
        { label: "Kendaraan Selesai", val: "16 Unit" },
        { label: "Omzet Part", val: "Rp 1.620.000" },
        { label: "Jasa Montir", val: "Rp 720.000" },
      ],
    },
  },
  {
    id: "nusa-salon",
    name: "Salon & Barbershop",
    category: "Perawatan & Grooming",
    color: "#78716C",
    lightBg: "bg-stone-100",
    borderCol: "border-stone-300",
    tagline: "Bagi Hasil Stylist & Jadwal Treatment",
    desc: "Aplikasi kasir salon kecantikan & barbershop: pilih stylist/capster per layanan, bagi hasil transparan, dan rekam produk perawatan.",
    specialFeatures: [
      { title: "Komisi Stylist Otomatis", desc: "Tiap transaksi potong rambut/treatment langsung masuk laporan komisi capster." },
      { title: "Paket Treatment Kombinasi", desc: "Paket hemat potong + cuci + creambath dengan single klik." },
      { title: "Laporan Per-Karyawan", desc: "Evaluasi kinerja pendapatan masing-masing stylist harian dan bulanan." },
    ],
    screens: {
      pos: [
        { item: "Haircut Premium + Wash", qty: "1 org", price: "Rp 60.000" },
        { item: "Hair Spa Matrix 60m", qty: "1 org", price: "Rp 95.000" },
        { item: "Pomade Matte Hold", qty: "1 pcs", price: "Rp 75.000" },
      ],
      stat: [
        { label: "Tamu Hari Ini", val: "28 Orang" },
        { label: "Stylist Aktif", val: "4 Person" },
        { label: "Laba Jasa", val: "Rp 1.840.000" },
      ],
    },
  },
  {
    id: "nusa-apotek",
    name: "Apotek",
    category: "Farmasi & Alkes",
    color: "#10B981",
    lightBg: "bg-emerald-50",
    borderCol: "border-emerald-200",
    tagline: "Lacak Expired Date, Batch & Resep",
    desc: "Dirancang memenuhi standar ritel farmasi: nomor batch obat, peringatan tanggal kedaluwarsa, resep dokter, dan obat generik/paten.",
    specialFeatures: [
      { title: "Monitoring Expired Date", desc: "Daftar obat mendekati kadaluarsa terdeteksi dini untuk cegah kerugian." },
      { title: "Input Resep & Racikan", desc: "Kalkulasi tuslah, embalase, dan komponen racikan puyer/kapsul." },
      { title: "Golongan Obat Lengkap", desc: "Klasifikasi obat bebas, bebas terbatas, keras, hingga suplemen kesehatan." },
    ],
    screens: {
      pos: [
        { item: "Paracetamol 500mg (10 tab)", qty: "2 strip", price: "Rp 14.000" },
        { item: "Amoxicillin 500mg", qty: "1 strip", price: "Rp 18.000" },
        { item: "Vitamin C 500mg 30s", qty: "1 btl", price: "Rp 42.000" },
      ],
      stat: [
        { label: "Struk Farmasi", val: "62 Resep" },
        { label: "Obat Mendekati Exp", val: "3 Item" },
        { label: "Total Transaksi", val: "Rp 2.450.000" },
      ],
    },
  },
  {
    id: "nusa-fotocopy",
    name: "Fotocopy & ATK",
    category: "Percetakan & Jilid",
    color: "#8B5CF6",
    lightBg: "bg-purple-50",
    borderCol: "border-purple-200",
    tagline: "Hitung Lembaran, Jilid & ATK",
    desc: "Cepat tanpa kalkulator manual: hitung ratusan lembar cetak bolak-balik, biaya jilid spiral/hardcover, dan ribuan item ATK.",
    specialFeatures: [
      { title: "Hitung Lembar & Kertas", desc: "Ketik jumlah lembar cetak A4/F4 hitam-putih / warna dengan tarif bertingkat." },
      { title: "Paket Jilid & Laminating", desc: "Otomatis gabungkan harga kertas + mika + lakban + jasa jilid." },
      { title: "Barcode Scanner ATK", desc: "Scan pulpen, buku, map, dan aksesoris kantor dengan respon instan." },
    ],
    screens: {
      pos: [
        { item: "Print Warna A4 HVS 80g", qty: "45 lbr", price: "Rp 45.000" },
        { item: "Jilid Spiral Kawat + Cover", qty: "2 buku", price: "Rp 30.000" },
        { item: "Kertas Double Folio 10s", qty: "1 pak", price: "Rp 12.000" },
      ],
      stat: [
        { label: "Total Lembar Cetak", val: "1.480 Lbr" },
        { label: "Jilid Selesai", val: "14 Buku" },
        { label: "Omzet Hari Ini", val: "Rp 920.000" },
      ],
    },
  },
];

export default function LandingPage() {
  const [activeVariant, setActiveVariant] = useState<VariantApp>(apps[0]);
  const [rotationDeg, setRotationDeg] = useState<number>(12);
  const [activeScreenIndex, setActiveScreenIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [tierMode, setTierMode] = useState<"pro" | "lite">("pro");
  const [periodMode, setPeriodMode] = useState<"monthly" | "lifetime">("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const phoneRef = useRef<HTMLDivElement>(null);

  // Switch screen automatically on rotation degrees
  useEffect(() => {
    const normalized = ((rotationDeg % 360) + 360) % 360;
    if (normalized >= 0 && normalized < 90) setActiveScreenIndex(0); // POS Screen
    else if (normalized >= 90 && normalized < 180) setActiveScreenIndex(1); // Stats Screen
    else if (normalized >= 180 && normalized < 270) setActiveScreenIndex(2); // Settings / Sync
    else setActiveScreenIndex(3); // Feature Details
  }, [rotationDeg]);

  // Touch / Mouse drag handler for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX;
    setRotationDeg((prev) => prev + delta * 0.45);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    const delta = e.touches[0].clientX - dragStartX;
    setRotationDeg((prev) => prev + delta * 0.55);
    setDragStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Generate WA text
  const currentPriceText =
    tierMode === "pro"
      ? periodMode === "monthly"
        ? "Pro Bulanan (Rp 99.000/bln)"
        : "Pro Lifetime (Rp 499.000)"
      : periodMode === "monthly"
      ? "Lite Bulanan (Rp 49.000/bln)"
      : "Lite Lifetime (Rp 249.000)";

  const waBuyUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Halo Admin NUSA, saya tertarik membeli lisensi ${activeVariant.name} paket ${currentPriceText}. Mohon info nomor rekening / QRIS pembayaran.`
  )}`;

  const waTrialUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Halo Admin NUSA, saya ingin mencoba Free Trial 3 Hari untuk NUSA ${activeVariant.name} (${tierMode.toUpperCase()}). Mohon panduan download & aktivasinya.`
  )}`;

  return (
    <div
      className="min-h-screen bg-[#FDFCFB] text-slate-900 selection:bg-orange-500 selection:text-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Top Notice Bar ─── */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">NUSA v2.2.57 Engine</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">Delta Sync SQLite &lt;1 Detik + R2 Offline Resilience</span>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Halo%20NUSA,%20saya%20butuh%20bantuan%20support`}
            target="_blank"
            rel="noreferrer"
            className="text-orange-400 hover:text-orange-300 transition-colors font-semibold"
          >
            CS WhatsApp: 0897-6280-303 &rarr;
          </a>
        </div>
      </div>

      {/* ─── Main Navigation ─── */}
      <header className="sticky top-0 z-50 bg-[#FDFCFB]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm shadow-orange-600/30">
              N
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-lg text-slate-900 leading-none">NUSA</div>
              <div className="text-[10px] text-slate-500 font-medium tracking-wide">POS Multi-Varian</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#showcase" className="hover:text-orange-600 transition-colors">3D Preview</a>
            <a href="#variants" className="hover:text-orange-600 transition-colors">8 Sektor Bisnis</a>
            <a href="#bento" className="hover:text-orange-600 transition-colors">Keunggulan POS</a>
            <a href="#pricing" className="hover:text-orange-600 transition-colors">Harga Pro & Lite</a>
            <a href="#faq" className="hover:text-orange-600 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href={waTrialUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-all"
            >
              Coba Trial 3 Hari
            </a>
            <a
              href="#pricing"
              className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg shadow-sm shadow-orange-600/20 active:scale-95 transition-all"
            >
              Beli Lisensi
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section (Editorial Tone) ─── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Editorial Value Proposition */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" />
                POS Kasir Generasi Baru Tanpa Ketergantungan Internet Penuh
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.12] mb-6">
                Satu Ekosistem POS Cepat.
                <span className="block text-orange-600 mt-1">Dibuat Spesifik untuk 8 Sektor Industri.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                Bukan aplikasi kasir generik yang dipaksakan untuk semua toko. NUSA menghadirkan 8 varian khusus—dari hitungan rentengan kelontong, tiket dapur resto, pengerjaan servis gadget, hingga racikan farmasi.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                <a
                  href="#pricing"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
                >
                  Pilih Lisensi & Mulai
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </a>
                <a
                  href="#showcase"
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm px-5 py-3.5 rounded-xl transition-all"
                >
                  Coba Interaksi 3D App
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 max-w-lg text-slate-700">
                <div>
                  <div className="text-xl font-extrabold text-slate-900">&lt; 1 Detik</div>
                  <div className="text-xs text-slate-500 mt-0.5">Waktu Transaksi Kasir</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900">100% Offline</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tetap Jalan Tanpa Sinyal</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900">Rp 49K</div>
                  <div className="text-xs text-slate-500 mt-0.5">Mulai Harga Terjangkau</div>
                </div>
              </div>
            </div>

            {/* Right Column: Mini Interactive Quick Switcher */}
            <div className="lg:col-span-5">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Sektor Toko Anda</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">8 Varian Siap</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {apps.slice(0, 6).map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setActiveVariant(app)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        activeVariant.id === app.id
                          ? "border-orange-500 bg-orange-50/70 shadow-sm"
                          : "border-slate-100 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: app.color }} />
                        <span className="text-xs font-bold text-slate-900">{app.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{app.category}</div>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-orange-400">Fitur Khas {activeVariant.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Preset Siap Pakai</span>
                  </div>
                  <div className="text-sm font-bold mb-1">{activeVariant.tagline}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{activeVariant.desc}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 3D Interactive Device Showcase Prototype ─── */}
      <section id="showcase" className="py-20 bg-slate-950 text-white relative overflow-hidden">
        {/* Background Subtle Tech Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-orange-400 text-xs font-semibold mb-3">
              <span>📱</span> Prototype 3D Showcase Interaktif
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Eksplorasi Antarmuka Kasir NUSA
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Geser atau sentuh HP untuk memutar 360°. Perhatikan bagaimana tema dan fitur layar menyesuaikan varian bisnis yang Anda pilih.
            </p>
          </div>

          {/* Variant Selector Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => setActiveVariant(app)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  activeVariant.id === app.id
                    ? "bg-white text-slate-950 border-white shadow-md scale-105"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: app.color }} />
                {app.name}
              </button>
            ))}
          </div>

          {/* 3D Interactive Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
            
            {/* Left Detail Panel */}
            <div className="lg:col-span-4 order-2 lg:order-1 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">Varian Terpilih</div>
                <div className="text-xl font-extrabold text-white mb-2">{activeVariant.name}</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{activeVariant.desc}</p>
                
                <div className="space-y-2.5">
                  {activeVariant.specialFeatures.map((feat, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <div className="text-xs font-bold text-slate-200 mb-0.5">{feat.title}</div>
                      <div className="text-[11px] text-slate-400">{feat.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <span className="text-white font-semibold block">Rotasi Realtime 3D</span>
                  Tarik mouse / swipe layar untuk inspeksi menu aplikasi
                </div>
              </div>
            </div>

            {/* Center: 3D Smartphone Device Container */}
            <div className="lg:col-span-8 order-1 lg:order-2 flex flex-col items-center justify-center">
              <div
                ref={phoneRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="cursor-grab active:cursor-grabbing select-none relative w-full max-w-[340px] sm:max-w-[360px] h-[580px] flex items-center justify-center"
                style={{ perspective: "1200px" }}
              >
                {/* 3D Phone Body */}
                <div
                  className="w-[280px] sm:w-[300px] h-[540px] rounded-[44px] p-3 transition-transform duration-75 shadow-2xl relative"
                  style={{
                    backgroundColor: "#1E293B",
                    border: `3px solid ${activeVariant.color}`,
                    transformStyle: "preserve-3d",
                    transform: `rotateY(${rotationDeg}deg) rotateX(4deg)`,
                    boxShadow: `0 25px 60px -15px ${activeVariant.color}33, 0 0 0 1px #334155`,
                  }}
                >
                  {/* Phone Bezel / Screen Edge */}
                  <div className="w-full h-full bg-slate-900 rounded-[34px] overflow-hidden flex flex-col relative border border-slate-800">
                    
                    {/* Top Speaker & Camera Notch */}
                    <div className="h-6 w-full bg-slate-950 flex items-center justify-center relative z-20">
                      <div className="w-14 h-3.5 bg-slate-900 rounded-full flex items-center justify-end px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      </div>
                    </div>

                    {/* App Header Inside Mockup */}
                    <div
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: activeVariant.color }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">
                          N
                        </div>
                        <span className="text-xs font-bold tracking-tight">NUSA {activeVariant.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-semibold bg-black/20 px-1.5 py-0.5 rounded">
                          {activeScreenIndex === 0 ? "KASIR POS" : activeScreenIndex === 1 ? "LAPORAN" : "SYNC"}
                        </span>
                      </div>
                    </div>

                    {/* Screen Content based on Rotation Index */}
                    <div className="flex-1 p-3 overflow-hidden bg-slate-900 text-slate-100 flex flex-col justify-between">
                      {activeScreenIndex === 0 ? (
                        /* Screen 0: Kasir POS */
                        <div className="space-y-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Keranjang Kasir</div>
                          {activeVariant.screens.pos.map((item, idx) => (
                            <div key={idx} className="p-2 bg-slate-800/80 rounded-lg flex items-center justify-between border border-slate-700/50">
                              <div>
                                <div className="text-xs font-semibold text-white">{item.item}</div>
                                <div className="text-[10px] text-slate-400">{item.qty}</div>
                              </div>
                              <div className="text-xs font-bold text-orange-400">{item.price}</div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                            <span className="text-slate-400">Total Tagihan</span>
                            <span className="font-extrabold text-white text-sm">Rp 193.000</span>
                          </div>
                          <div
                            className="w-full py-2 rounded-xl text-center font-bold text-xs text-white shadow-md"
                            style={{ backgroundColor: activeVariant.color }}
                          >
                            Bayar Tunai / QRIS
                          </div>
                        </div>
                      ) : activeScreenIndex === 1 ? (
                        /* Screen 1: Dashboard Stats */
                        <div className="space-y-2.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Ringkasan Omzet Hari Ini</div>
                          {activeVariant.screens.stat.map((st, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700">
                              <div className="text-[10px] text-slate-400">{st.label}</div>
                              <div className="text-sm font-extrabold text-white mt-0.5">{st.val}</div>
                            </div>
                          ))}
                          <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-[10px] text-emerald-300">
                            ✓ Terhubung dengan printer thermal & auto-potong stok
                          </div>
                        </div>
                      ) : (
                        /* Screen 2/3: Delta Sync & Security */
                        <div className="space-y-3 py-4 text-center">
                          <div className="w-12 h-12 mx-auto rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xl">
                            ☁️
                          </div>
                          <div className="text-xs font-bold text-white">Delta Sync Realtime Active</div>
                          <p className="text-[11px] text-slate-400 leading-relaxed px-2">
                            Setiap baris transaksi otomatis tersimpan di SQLite lokal dan di-backup ke Cloudflare R2 dalam milidetik.
                          </p>
                          <div className="inline-block text-[10px] bg-slate-800 text-orange-400 font-mono px-2.5 py-1 rounded-full">
                            status: healthy (0 pending outbox)
                          </div>
                        </div>
                      )}

                      {/* Phone Bottom Navigation Bar */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[10px] text-slate-400">
                        <span className={activeScreenIndex === 0 ? "text-orange-400 font-bold" : ""}>Kasir</span>
                        <span className={activeScreenIndex === 1 ? "text-orange-400 font-bold" : ""}>Laporan</span>
                        <span>Stok</span>
                        <span>Setting</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Drag Hint Float Badge */}
                <div className="absolute -bottom-2 bg-slate-900/90 border border-slate-700 text-slate-300 text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-orange-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="30 30" /></svg>
                  Tarik untuk putar 360° ({Math.round(rotationDeg % 360)}°)
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Bento Grid Core Architecture & Features ─── */}
      <section id="bento" className="py-20 md:py-24 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Arsitektur Handal</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 mb-3">
              Dibangun untuk Kecepatan & Ketahanan Maksimal
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Dirancang dari fondasi offline-first SQLite lokal agar kasir tidak pernah macet saat antrian panjang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Bento 1: Delta Sync (Large 8 Col) */}
            <div className="md:col-span-8 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg mb-4">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Delta Sync SQLite: Sinkronisasi Transaksi &lt; 1 Detik
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  NUSA tidak mengunggah ulang seluruh database tiap kali ada transaksi. Hanya 1 baris delta (kurang dari 3KB) yang dikirim lewat SQLite trigger outbox ke Cloudflare Workers & R2. Sangat hemat kuota dan super cepat.
                </p>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 mb-1">// Alur Delta Sync NUSA v2.2.57</div>
                <div className="text-emerald-400">Kasir Input Trx &rarr; Local SQLite Commit (0ms) &rarr; Outbox Trigger &rarr; WS Sync Cloud (&lt;1s)</div>
              </div>
            </div>

            {/* Bento 2: 100% Offline First (4 Col) */}
            <div className="md:col-span-4 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                  📡
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  100% Offline-First
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Mati lampu? WiFi toko terputus? Kasir tetap melayani penjualan, scan barcode, dan cetak struk tanpa hambatan. Saat internet kembali, data otomatis tersinkron.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
                ✓ Tidak ada loading spinner saat checkout
              </div>
            </div>

            {/* Bento 3: AI Assistant (4 Col) */}
            <div className="md:col-span-4 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg mb-4">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  AI Business Assistant
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Tanya langsung lewat dashboard: <em>&quot;Produk mana yang paling laris minggu ini?&quot;</em> atau <em>&quot;Kapan waktu tersibuk toko saya?&quot;</em> untuk keputusan bisnis berbasis data.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-purple-600">
                Eksklusif di NUSA Pro (Cloud)
              </div>
            </div>

            {/* Bento 4: Hardware Compatibility (8 Col) */}
            <div className="md:col-span-8 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4">
                  🖨️
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Dukungan Hardware Thermal, Barcode & Laci Kasir
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Kompatibel luas dengan printer Bluetooth/USB 58mm & 80mm (ESC/POS), printer label barcode rak (TSPL), barcode scanner kamera / handheld laser, serta cash drawer otomatis.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-700">Thermal 58/80mm</div>
                <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-700">Label TSPL Barcode</div>
                <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-700">Scanner Bluetooth/USB</div>
                <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-700">Auto Cash Drawer</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 8 Variants Deep-Dive ─── */}
      <section id="variants" className="py-20 md:py-24 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Pilihan Aplikasi</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 mb-3">
              8 Aplikasi Khusus Sesuai Bidang Usaha
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Setiap aplikasi memiliki alur kerja dan istilah operasional yang disesuaikan langsung dengan sektor industri Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: app.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{app.category}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-1">NUSA {app.name}</h3>
                  <div className="text-xs font-bold text-orange-600 mb-3">{app.tagline}</div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{app.desc}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `Halo Admin NUSA, saya ingin tanya fitur lebih detail untuk NUSA ${app.name}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-700 hover:text-orange-600 flex items-center justify-between group"
                  >
                    <span>Konsultasi Varian Ini</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Pricing & Comparison (Pro vs Lite) ─── */}
      <section id="pricing" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Transparan & Terjangkau</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 mb-3">
              Pilihan Lisensi Pro & Lite
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Pilih antara fleksibilitas Cloud (Pro) atau keandalan Offline-First murni (Lite) tanpa biaya tersembunyi.
            </p>
          </div>

          {/* Controls: Pro/Lite + Monthly/Lifetime Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {/* Pro vs Lite Toggle */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setTierMode("pro")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  tierMode === "pro"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                NUSA Pro (Cloud)
              </button>
              <button
                onClick={() => setTierMode("lite")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  tierMode === "lite"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                NUSA Lite (Offline)
              </button>
            </div>

            {/* Period Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setPeriodMode("monthly")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  periodMode === "monthly"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setPeriodMode("lifetime")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  periodMode === "lifetime"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Lifetime (Hemat)
                <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">BEST</span>
              </button>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-slate-900 p-8 sm:p-10 shadow-xl mb-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[11px] font-extrabold px-6 py-1.5 rounded-bl-2xl tracking-wider">
              {tierMode === "pro" ? "CLOUD EDITION" : "OFFLINE EDITION"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7">
                <div className="text-xs font-bold text-orange-600 mb-1">Varian Aktif: NUSA {activeVariant.name}</div>
                <h3 className="text-2xl font-extrabold text-slate-950 mb-2">
                  Paket NUSA {tierMode === "pro" ? "Pro" : "Lite"} {periodMode === "monthly" ? "Bulanan" : "Lifetime"}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {tierMode === "pro"
                    ? "Sinkronisasi real-time antar perangkat, AI Assistant, multi cabang, web dashboard, dan backup otomatis."
                    : "POS kasir offline murni. Aktivasi via email + license key tanpa wajib akun Google. Sangat stabil untuk 1 toko."}
                </p>

                <div className="space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    {tierMode === "pro" ? "Multi Perangkat via Google Sign-In" : "1 Lisensi Mandiri per Toko"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    {tierMode === "pro" ? "Cloud Delta Sync & AI Assistant" : "Backup & Restore Database Lokal"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    Update Aplikasi Gratis Selamanya
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    Support Langsung via WhatsApp CS
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 text-center md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold mb-1">Investasi</div>
                  <div className="text-4xl font-extrabold text-slate-950 tracking-tight">
                    {tierMode === "pro"
                      ? periodMode === "monthly"
                        ? "Rp 99K"
                        : "Rp 499K"
                      : periodMode === "monthly"
                      ? "Rp 49K"
                      : "Rp 249K"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {periodMode === "monthly" ? "/ bulan berjalan" : "/ seumur hidup (sekali bayar)"}
                  </div>
                </div>

                <div className="mt-8 space-y-2.5">
                  <a
                    href={waBuyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-600/20 active:scale-98 transition-all"
                  >
                    Beli Lisensi Sekarang &rarr;
                  </a>
                  <a
                    href={waTrialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Coba Gratis 3 Hari Dulu
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <h4 className="text-base font-extrabold text-slate-900">Perbandingan Lengkap: NUSA Pro vs NUSA Lite</h4>
              <p className="text-xs text-slate-500 mt-0.5">Semua fitur POS kasir dasar tetap lengkap tanpa pengurangan di kedua versi.</p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { name: "POS Kasir & Cetak Struk Thermal", pro: "Ya", lite: "Ya" },
                { name: "Laporan Omzet, Laba Bersih & HPP", pro: "Ya", lite: "Ya" },
                { name: "Manajemen Multi-Satuan & Stok", pro: "Ya", lite: "Ya" },
                { name: "Dukungan Barcode Scanner & Label TSPL", pro: "Ya", lite: "Ya" },
                { name: "Arsitektur Offline-First (Tanpa Internet)", pro: "Ya", lite: "Ya" },
                { name: "Realtime Delta Sync Multi-Device", pro: "Ya (Cloudflare R2)", lite: "Tidak (Lokal Saja)" },
                { name: "AI Business Assistant", pro: "Ya", lite: "Tidak" },
                { name: "Manajemen Multi-Cabang", pro: "Ya", lite: "Tidak" },
                { name: "Web Dashboard & Export Spreadsheet", pro: "Ya", lite: "Tidak" },
                { name: "Metode Login & Aktivasi", pro: "Google Sign-In", lite: "Email + Key Mandiri" },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-4 items-center hover:bg-slate-50/80">
                  <div className="col-span-6 font-semibold text-slate-800">{row.name}</div>
                  <div className="col-span-3 font-bold text-blue-600 text-center">{row.pro}</div>
                  <div className="col-span-3 font-bold text-emerald-600 text-center">{row.lite}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ─── How it Works (3 Langkah) ─── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Mulai Jualan dalam 3 Langkah Mudah
            </h2>
            <p className="text-slate-400 text-sm">Tidak butuh teknisi khusus. Semua disiapkan siap pakai dalam hitungan menit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-800/70 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-base mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Pilih Varian & Paket</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pilih varian usaha Anda (Kelontong, F&B, Servis, dll) dan paket Pro/Lite. Lakukan aktivasi cepat via WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/70 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-base mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Download APK & Aktivasi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pasang aplikasi di tablet/HP Android Anda. Masukkan Key aktivasi yang dikirimkan. Aplikasi langsung aktif.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/70 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-base mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">Input Produk & Kasir Siap</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tambahkan produk atau import data toko Anda, hubungkan printer bluetooth jika ada, dan mulai transaksi pertama.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-20 md:py-24 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Bantuan & Informasi</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 mb-2">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">Jawaban ringkas seputar operasional, lisensi, dan perangkat.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Apa perbedaan paling mendasar antara NUSA Pro dan NUSA Lite?",
                a: "NUSA Pro ditujukan untuk bisnis yang butuh sinkronisasi cloud real-time, multi-cabang, login Google, dan AI Assistant. Sedangkan NUSA Lite ditujukan bagi pemilik 1 toko yang ingin sistem kasir offline mandiri tanpa perlu internet harian, aktivasi hanya butuh email & key.",
              },
              {
                q: "Apakah NUSA bisa digunakan di HP atau tablet Android biasa?",
                a: "Bisa. NUSA dioptimalkan untuk Android mulai versi 8.0 ke atas, baik pada smartphone biasa, tablet 10 inci, hingga mesin POS Android terintegrasi printer seperti Sunmi, iMin, dsb.",
              },
              {
                q: "Bagaimana jika internet di toko mati saat transaksi kasir?",
                a: "NUSA dibangun dengan arsitektur Offline-First menggunakan database SQLite lokal. Seluruh transaksi kasir, potong stok, dan cetak struk tetap berfungsi 100% normal tanpa koneksi internet. Begitu koneksi aktif kembali (di NUSA Pro), data otomatis tersinkron ke cloud.",
              },
              {
                q: "Apakah satu lisensi bisa dipakai untuk lebih dari satu varian?",
                a: "Satu lisensi berlaku spesifik untuk satu jenis aplikasi varian (misal NUSA Kelontong). Jika Anda memiliki dua jenis usaha berbeda (misal toko kelontong dan cafe F&B), Anda dapat mengaktifkan lisensi masing-masing dengan satu akun yang sama.",
              },
              {
                q: "Bagaimana cara melakukan backup data jika ganti HP?",
                a: "Di NUSA Pro, data otomatis tersimpan di cloud R2 sehingga cukup login Google di HP baru dan data langsung kembali. Di NUSA Lite, terdapat menu Export Backup database yang dapat dipindahkan ke HP baru dengan mudah.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full p-5 text-left font-bold text-sm text-slate-900 flex justify-between items-center hover:bg-slate-50"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 font-mono text-base">{openFaqIndex === i ? "−" : "+"}</span>
                </button>
                {openFaqIndex === i && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom Direct WA CTA ─── */}
      <section className="py-16 bg-orange-600 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Butuh Rekomendasi Varian untuk Toko Anda?
          </h2>
          <p className="text-orange-100 text-xs sm:text-sm mb-8 leading-relaxed">
            Hubungi tim support NUSA langsung via WhatsApp di <strong>0897-6280-303</strong>. Kami bantu pilihkan varian dan paket yang paling pas untuk operasional bisnis Anda.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              "Halo Admin NUSA, saya ingin konsultasi memilih aplikasi kasir yang tepat untuk bisnis saya."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-black text-white font-extrabold text-sm px-8 py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            <span>Chat WhatsApp Sekarang (0897-6280-303)</span>
            <span>&rarr;</span>
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-slate-950 text-slate-500 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-xs">
              N
            </div>
            <span className="font-extrabold text-slate-200">NUSA POS Indonesia</span>
            <span>&copy; {new Date().getFullYear()} Halu Goods Indonesia.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              WhatsApp Support (0897-6280-303)
            </a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">
              Lisensi Pro & Lite
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
