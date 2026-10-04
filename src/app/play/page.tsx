"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface AppVariant {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  tagline: string;
  description: string;
  logo: string;
  themeColor: string;
  packageName: string;
  rating: string;
  reviewsCount: string;
  downloads: string;
  size: string;
  ratedAge: string;
  latestVersion: string;
  latestBuild: number;
  releaseDate: string;
  changelog: string[];
  features: string[];
  screenshots: string[];
}

const NUSA_APPS: AppVariant[] = [
  {
    id: "nusa-kelontong",
    slug: "kelontong",
    name: "NUSA Kelontong: Kasir Toko",
    categoryName: "Minimarket & Grosir",
    tagline: "Aplikasi Kasir POS Toko Kelontong, Minimarket, dan Sembako",
    description:
      "Aplikasi kasir (POS) Android serba 1 HP khusus toko kelontong, sembako, agen, dan grosir. Mendukung scanner barcode kamera & Bluetooth, multi-satuan (renceng/dus/pcs), harga grosir bertingkat otomatis, stok menipis, hutang piutang pelanggan, cetak struk thermal, laporan laba bersih realtime, dan toko online gratis.",
    logo: "/icons/variants/kelontong.png",
    themeColor: "#F97316",
    packageName: "com.nusa.kelontong",
    rating: "4.9",
    reviewsCount: "2,4 rb ulasan",
    downloads: "50 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Perhitungan laba bersih otomatis pada tiap nota transaksi",
      "Pencegahan limit D1 outbox delta sync cloud",
      "Perbaikan sinkronisasi harga coret & diskon toko online",
      "Peningkatan kecepatan printer Bluetooth thermal SPP",
      "Toleransi versi backup database (-1 versi)",
    ],
    features: [
      "Scanner Barcode Kamera & Barcode Scanner USB/Bluetooth",
      "Harga Grosir Bertingkat (Beli 1 @5.000, Beli 10 @4.500)",
      "Peringatan Stok Menipis & Stok Habis Realtime",
      "Pencatatan Hutang & Pembayaran Piutang Pelanggan",
      "100% Offline Mode & Cloud Backup Otomatis",
    ],
    screenshots: ["/images/kelontong-1.png", "/images/kelontong-2.png"],
  },
  {
    id: "nusa-fnb",
    slug: "fnb",
    name: "NUSA F&B: Kasir Resto & Kafe",
    categoryName: "Restoran & Kuliner",
    tagline: "Aplikasi Kasir Restoran, Kafe, Warung Kopi, dan Franchise Kuliner",
    description:
      "Solusi kasir lengkap untuk bisnis kuliner. Manajemen nomor meja, split bill, cetak nota pesanan ke dapur (Kitchen Printer) & Bar terpisah, varian menu (level pedas, topping, ukuran), dynamic QRIS, dan integrasi order online.",
    logo: "/icons/variants/fnb.png",
    themeColor: "#DC2626",
    packageName: "com.nusa.fnb",
    rating: "4.9",
    reviewsCount: "1,8 rb ulasan",
    downloads: "25 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Laba bersih per item menu & transaksi kuliner",
      "Cetak nota dapur instan via thermal printer",
      "Optimalisasi sinkronisasi pesanan meja realtime",
      "Pembaruan katalog online storefront menu",
    ],
    features: [
      "Manajemen Meja & Status Pesanan (Dine-in / Takeaway)",
      "Cetak Dapur & Bar Terpisah (Kitchen Display/Printer)",
      "Pilihan Varian, Topping, & Modifiers Tanpa Batas",
      "Dynamic QRIS ShopeePay & Pembayaran Nontunai",
    ],
    screenshots: [],
  },
  {
    id: "nusa-laundry",
    slug: "laundry",
    name: "NUSA Laundry: Kasir Kiloan",
    categoryName: "Jasa Cuci & Laundry",
    tagline: "Kasir Usaha Laundry Kiloan, Satuan, Sepatu, dan Karpet",
    description:
      "Aplikasi POS laundry profesional dengan pelacakan status pengerjaan (Antre, Cuci, Kering, Setrika, Siap Diambil, Selesai), nomor rak penyimpanan pakaian, notifikasi nota WhatsApp otomatis ke pelanggan saat cucian selesai.",
    logo: "/icons/variants/laundry.png",
    themeColor: "#EC4899",
    packageName: "com.nusa.laundry",
    rating: "4.9",
    reviewsCount: "950 ulasan",
    downloads: "15 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Notifikasi WhatsApp otomatis saat cucian siap diambil",
      "Pelacakan nomor rak dan barcode nota cucian",
      "Perhitungan laba operasional deterjen & parfum",
    ],
    features: [
      "Tracking Status 5 Tahap Pengerjaan Laundry",
      "Notifikasi WhatsApp Otomatis ke Nomor Pelanggan",
      "Dukungan Paket Deposit & Member Laundry",
      "Cetak Label Nomor Rak & Tag Pakaian",
    ],
    screenshots: [],
  },
  {
    id: "nusa-bengkel",
    slug: "bengkel",
    name: "NUSA Bengkel: Kasir & Servis",
    categoryName: "Otomotif & Sparepart",
    tagline: "Aplikasi Kasir Bengkel Motor, Mobil, dan Toko Sparepart",
    description:
      "Catat plat nomor kendaraan, riwayat kilometer, pemisahan otomatis antara ongkos jasa mekanik dan harga sparepart, bagi hasil komisi mekanik, serta laporan riwayat servis berkala kendaraan pelanggan.",
    logo: "/icons/variants/bengkel.png",
    themeColor: "#EAB308",
    packageName: "com.nusa.bengkel",
    rating: "4.8",
    reviewsCount: "820 ulasan",
    downloads: "10 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Rincian jasa montir & sparepart pada nota kasir",
      "Pencatatan riwayat servis plat nomor kendaraan",
      "Kalkulasi komisi montir per pengerjaan",
    ],
    features: [
      "Pencatatan No Polisi & Riwayat Servis Kendaraan",
      "Pemisahan Nota Jasa Mekanik & Sparepart",
      "Perhitungan Komisi Montir / Teknisi Otomatis",
      "Stok Sparepart & Barcode Scanner Part",
    ],
    screenshots: [],
  },
  {
    id: "nusa-salon",
    slug: "salon",
    name: "NUSA Salon: Barbershop & Spa",
    categoryName: "Kecantikan & Perawatan",
    tagline: "Aplikasi Kasir Barbershop, Salon Kecantikan, dan Spa",
    description:
      "Manajemen antrean pelanggan, pemilihan kapster/stylist, komisi karyawan per jenis layanan potong/perawatan, booking jadwal perawatan, dan paket bundling perawatan rambut/wajah.",
    logo: "/icons/variants/salon.png",
    themeColor: "#3B82F6",
    packageName: "com.nusa.salon",
    rating: "4.9",
    reviewsCount: "640 ulasan",
    downloads: "10 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Perhitungan komisi capster & terapis instan",
      "Pembaruan antrean layanan & kasir pembayaran",
      "Sinkronisasi cloud backup data pelanggan member",
    ],
    features: [
      "Pilihan Capster / Stylist per Perawatan",
      "Komisi Capster Berdasarkan Persentase / Nominal",
      "Manajemen Booking Jadwal & Antrean",
      "Paket Perawatan & Membership Salon",
    ],
    screenshots: [],
  },
  {
    id: "nusa-apotek",
    slug: "apotek",
    name: "NUSA Apotek: Toko Obat",
    categoryName: "Kesehatan & Farmasi",
    tagline: "Aplikasi Kasir Apotek, Toko Obat, dan Klinik Medis",
    description:
      "Peringatan dini tanggal kadaluarsa (expired date) obat, pencatatan nomor batch, resep dokter, dosis racikan, dan kontrol stok obat keras / bebas secara akurat sesuai standar kefarmasian.",
    logo: "/icons/variants/apotek.png",
    themeColor: "#10B981",
    packageName: "com.nusa.apotek",
    rating: "4.9",
    reviewsCount: "1,1 rb ulasan",
    downloads: "15 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Peringatan expired date obat otomatis 30-90 hari",
      "Pencatatan nomor batch & supplier obat",
      "Perhitungan margin resep racikan",
    ],
    features: [
      "Monitoring Tanggal Kadaluarsa & Nomor Batch",
      "Pencatatan Obat Resep Dokter & Non-Resep",
      "Multi-Kemasan (Strip, Tablet, Botol, Box)",
      "Laporan Obat Fast Moving & Slow Moving",
    ],
    screenshots: [],
  },
  {
    id: "nusa-fotocopy",
    slug: "fotocopy",
    name: "NUSA Fotocopy: ATK & Percetakan",
    categoryName: "Percetakan & ATK",
    tagline: "Aplikasi Kasir Fotocopy, Usaha Percetakan, dan Alat Tulis Kantor",
    description:
      "Kalkulasi cepat cetak per lembar (B&W/Warna), ukuran kertas (A4, F4, A3), laminating, jilid spiral/hardcover, serta stok ribuan barang ATK dengan barcode scanner.",
    logo: "/icons/variants/fotocopy.png",
    themeColor: "#8B5CF6",
    packageName: "com.nusa.fotocopy",
    rating: "4.8",
    reviewsCount: "530 ulasan",
    downloads: "8 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Kalkulator cepat hitung biaya cetak per halaman",
      "Form order cetak dokumen via WhatsApp",
      "Manajemen ribuan master barcode ATK",
    ],
    features: [
      "Kalkulator Cetak Per Lembar & Jilid Otomatis",
      "Daftar Harga Kertas & Finishing Lengkap",
      "Stok ATK dengan Barcode Scanner Cepat",
      "Form Pesanan Cetak Dokumen Terintegrasi",
    ],
    screenshots: [],
  },
  {
    id: "nusa-servis",
    slug: "servis",
    name: "NUSA Servis: HP & Elektronik",
    categoryName: "Reparasi & Elektronik",
    tagline: "Aplikasi Kasir Servis HP, Komputer, Laptop, dan Barang Elektronik",
    description:
      "Cetak tanda terima servis ber-barcode untuk pelanggan, tracking status pengerjaan (Masuk, Cek Kerusakan, Tunggu Sparepart, Selesai, Diambil), garansi pengerjaan, dan pemisahan biaya sparepart + jasa teknisi.",
    logo: "/icons/variants/servis.png",
    themeColor: "#152C63",
    packageName: "com.nusa.servis",
    rating: "4.9",
    reviewsCount: "710 ulasan",
    downloads: "10 rb+",
    size: "52 MB",
    ratedAge: "Rating 3+",
    latestVersion: "2.2.57",
    latestBuild: 164,
    releaseDate: "4 Okt 2026",
    changelog: [
      "Cetak nota tanda terima servis ber-barcode QR",
      "Pelacakan status unit servis oleh pelanggan",
      "Pemisahan biaya jasa teknisi dan harga komponen",
    ],
    features: [
      "Tanda Terima Servis dengan Barcode QR Unik",
      "Tracking 5 Status Pengerjaan Barang Servis",
      "Klaim Garansi & Riwayat Kerusakan Unit",
      "Laporan Pendapatan Jasa Servis & Sparepart",
    ],
    screenshots: [],
  },
];

function PlayNusaStoreContent() {
  const searchParams = useSearchParams();

  // Parameter dari aplikasi saat user klik Update:
  // /play?product=nusa-kelontong&build=163&key=NUSA-XXXX
  const paramProduct = searchParams.get("product") || searchParams.get("p") || "";
  const paramBuild = parseInt(searchParams.get("build") || searchParams.get("b") || "0", 10);
  const paramKey = searchParams.get("key") || searchParams.get("k") || "";

  const [activeTab, setActiveTab] = useState<"apps" | "top" | "categories">("apps");
  const [selectedApp, setSelectedApp] = useState<AppVariant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Auto-select app jika URL membawa parameter produk
  useEffect(() => {
    if (paramProduct) {
      const match = NUSA_APPS.find(
        (a) =>
          a.id.toLowerCase() === paramProduct.toLowerCase() ||
          a.slug.toLowerCase() === paramProduct.toLowerCase()
      );
      if (match) {
        setSelectedApp(match);
      }
    }
  }, [paramProduct]);

  const filteredApps = useMemo(() => {
    let list = [...NUSA_APPS];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.categoryName.toLowerCase().includes(q) ||
          a.tagline.toLowerCase().includes(q)
      );
    }
    // Jika ada produk yang sedang dipakai user, taruh di paling atas
    if (paramProduct) {
      list.sort((a, b) => {
        const aMatch =
          a.id.toLowerCase() === paramProduct.toLowerCase() ||
          a.slug.toLowerCase() === paramProduct.toLowerCase()
            ? 1
            : 0;
        const bMatch =
          b.id.toLowerCase() === paramProduct.toLowerCase() ||
          b.slug.toLowerCase() === paramProduct.toLowerCase()
            ? 1
            : 0;
        return bMatch - aMatch;
      });
    }
    return list;
  }, [searchQuery, paramProduct]);

  // Direct APK download handler
  const handleDownload = (app: AppVariant) => {
    setDownloadingId(app.id);
    const downloadUrl = `https://github.com/halugoods/${app.id}/releases/download/v${app.latestVersion}+${app.latestBuild}/${app.id}-release.apk`;

    // Trigger instant browser download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${app.id}-v${app.latestVersion}+${app.latestBuild}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 2000);
  };

  // Cek apakah varian ini butuh update berdasarkan build yang dikirim app
  const isUpdateNeeded = (app: AppVariant) => {
    const isThisApp =
      paramProduct &&
      (app.id.toLowerCase() === paramProduct.toLowerCase() ||
        app.slug.toLowerCase() === paramProduct.toLowerCase());
    if (isThisApp && paramBuild > 0 && paramBuild < app.latestBuild) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#202124] font-sans antialiased pb-20 select-none">
      {/* ══════════════════ GOOGLE PLAY HEADER ══════════════════ */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E8EAED] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setSelectedApp(null)}>
            <div className="flex items-center">
              {/* Official Google Play Logo Icon */}
              <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
                <path
                  d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z"
                  fill="#EA4335"
                />
                <path
                  d="M47 0C21 0 0 21 0 47v418c0 26 21 47 47 47 13.5 0 25.8-5.6 34.6-14.7l243.7-263L47 0z"
                  fill="#4285F4"
                />
                <path
                  d="M325.3 277.7l60.1 60.1L104.6 499c-8.8-9.1-34.6-14.7-34.6-14.7l255.3-206.6z"
                  fill="#34A853"
                />
                <path
                  d="M486.2 231.1L385.4 174.2l-60.1 60.1 60.1 60.1 100.8-56.9c16.3-9.2 25.8-26.6 25.8-43.2s-9.5-34-25.8-43.2z"
                  fill="#FBBC04"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-semibold text-[#5F6368] tracking-tight leading-none">
                Google Play <span className="text-[#01875f] font-bold">· NUSA</span>
              </span>
            </div>
          </div>

          {/* Search Pill Bar (Play Store Style) */}
          <div className="flex-1 max-w-md hidden sm:flex items-center gap-2.5 bg-[#F1F3F4] rounded-full px-4 py-2 border border-transparent focus-within:bg-white focus-within:border-[#01875f] focus-within:shadow-md transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari varian aplikasi NUSA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#202124] placeholder-[#5F6368] outline-none"
            />
          </div>

          {/* User Status / App Badge */}
          <div className="flex items-center gap-3">
            {paramBuild > 0 ? (
              <div className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#137333] px-3 py-1.5 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#137333] animate-pulse" />
                <span>Terdeteksi: build +{paramBuild}</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#01875f] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                N
              </div>
            )}
          </div>
        </div>

        {/* PlayStore Category Tabs */}
        {!selectedApp && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto border-t border-[#E8EAED] text-sm font-medium">
            <button
              onClick={() => setActiveTab("apps")}
              className={`py-3 relative cursor-pointer font-semibold ${
                activeTab === "apps" ? "text-[#01875f]" : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              Semua Varian
              {activeTab === "apps" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#01875f] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("top")}
              className={`py-3 relative cursor-pointer ${
                activeTab === "top" ? "text-[#01875f] font-semibold" : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              Populer
              {activeTab === "top" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#01875f] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-3 relative cursor-pointer ${
                activeTab === "categories" ? "text-[#01875f] font-semibold" : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              Kategori Usaha
              {activeTab === "categories" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#01875f] rounded-t-full" />
              )}
            </button>
          </div>
        )}
      </header>

      {/* ══════════════════ MAIN CONTENT ══════════════════ */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        {/* Mobile Search Bar */}
        <div className="sm:hidden mb-4">
          <div className="flex items-center gap-2.5 bg-[#F1F3F4] rounded-full px-4 py-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari aplikasi NUSA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#202124] placeholder-[#5F6368] outline-none"
            />
          </div>
        </div>

        {/* ══════════════════ IF DETAIL VIEW IS OPEN ══════════════════ */}
        {selectedApp ? (
          <div className="animate-fade-in">
            {/* Back Button */}
            <button
              onClick={() => setSelectedApp(null)}
              className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer py-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Kembali ke Semua Aplikasi</span>
            </button>

            {/* App Detail Header (Play Store Style) */}
            <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7 pb-6 border-b border-[#E8EAED]">
              {/* App Icon */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedApp.logo}
                alt={selectedApp.name}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-md border border-[#E8EAED] flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight leading-tight">
                  {selectedApp.name}
                </h1>
                <p className="text-sm font-semibold text-[#01875f] mt-1">
                  PT Halu Goods Indonesia
                </p>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Berisi iklan · Pembelian dalam aplikasi
                </p>

                {/* Rating & Stats Bar (Exact Play Store 4 Column) */}
                <div className="flex items-center gap-5 sm:gap-8 mt-4 pt-4 border-t border-[#F1F3F4] text-center overflow-x-auto">
                  {/* Rating */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-sm font-bold text-[#202124]">
                      <span>{selectedApp.rating}</span>
                      <span className="text-xs text-[#202124]">★</span>
                    </div>
                    <span className="text-[11px] text-[#5F6368] mt-0.5 whitespace-nowrap">
                      {selectedApp.reviewsCount}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-[#E8EAED]" />

                  {/* Size */}
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-bold text-[#202124]">{selectedApp.size}</div>
                    <span className="text-[11px] text-[#5F6368] mt-0.5 whitespace-nowrap">
                      Ukuran file
                    </span>
                  </div>

                  <div className="h-6 w-px bg-[#E8EAED]" />

                  {/* Age rating */}
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-bold text-[#202124]">3+</div>
                    <span className="text-[11px] text-[#5F6368] mt-0.5 whitespace-nowrap">
                      Rating 3+
                    </span>
                  </div>

                  <div className="h-6 w-px bg-[#E8EAED]" />

                  {/* Downloads */}
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-bold text-[#202124]">
                      {selectedApp.downloads}
                    </div>
                    <span className="text-[11px] text-[#5F6368] mt-0.5 whitespace-nowrap">
                      Download
                    </span>
                  </div>
                </div>

                {/* Play Store Action Button (Green Solid Pill) */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleDownload(selectedApp)}
                    disabled={downloadingId === selectedApp.id}
                    className="flex-1 sm:flex-initial min-w-[200px] h-11 px-8 rounded-full bg-[#01875f] hover:bg-[#007350] active:scale-[0.98] text-white font-semibold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {downloadingId === selectedApp.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengunduh APK...</span>
                      </>
                    ) : isUpdateNeeded(selectedApp) ? (
                      <>
                        <span>Update ke v{selectedApp.latestVersion}+{selectedApp.latestBuild}</span>
                      </>
                    ) : (
                      <>
                        <span>Install v{selectedApp.latestVersion}+{selectedApp.latestBuild}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#01875f">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                    <span>Play Protect Terverifikasi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* What's New Section (Play Store "Yang Baru") */}
            <div className="py-6 border-b border-[#E8EAED]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-[#202124]">Yang baru</h2>
                <span className="text-xs text-[#5F6368]">v{selectedApp.latestVersion}+{selectedApp.latestBuild}</span>
              </div>
              <p className="text-xs text-[#5F6368] mb-3">Diperbarui pada {selectedApp.releaseDate}</p>
              <ul className="space-y-1.5 text-sm text-[#3C4043]">
                {selectedApp.changelog.map((ch, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#01875f] font-bold">•</span>
                    <span>{ch}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* About App Section */}
            <div className="py-6 border-b border-[#E8EAED]">
              <h2 className="text-base font-bold text-[#202124] mb-3">Tentang aplikasi ini</h2>
              <p className="text-sm text-[#3C4043] leading-relaxed whitespace-pre-line mb-4">
                {selectedApp.description}
              </p>

              <h3 className="text-sm font-bold text-[#202124] mb-2">Fitur Unggulan:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#3C4043]">
                {selectedApp.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#01875f]">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Safety Section */}
            <div className="py-6">
              <h2 className="text-base font-bold text-[#202124] mb-2">Keamanan data</h2>
              <p className="text-xs text-[#5F6368] mb-3">
                Keamanan data pengguna adalah prioritas utama. Aplikasi ini mengenkripsi data offline & cloud
                menggunakan standar AES-256 dan protokol anti data loss.
              </p>
              <div className="p-3.5 rounded-xl border border-[#E8EAED] bg-[#F8F9FA] space-y-2 text-xs text-[#3C4043]">
                <div className="flex items-center gap-2">
                  <span className="text-[#01875f] font-bold">🔒</span>
                  <span>Data dienkripsi saat transit dan di penyimpanan lokal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#01875f] font-bold">🛡️</span>
                  <span>Bebas biaya langganan bulanan ($0 Cloud Free-tier infrastructure)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ══════════════════ APP STORE LIST VIEW ══════════════════ */
          <div>
            {/* Promo / Banner Card */}
            {paramBuild > 0 && paramBuild < 164 && (
              <div className="mb-6 p-4 rounded-2xl bg-[#E6F4EA] border border-[#CEEAD6] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#137333] text-white flex items-center justify-center font-bold text-lg">
                    ↑
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#137333]">Pembaruan Versi Tersedia</h3>
                    <p className="text-xs text-[#202124]">
                      Aplikasi Anda saat ini (build +{paramBuild}) dapat diperbarui ke rilis terbaru +164.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#202124]">Aplikasi Kasir POS Unggulan</h2>
              <p className="text-xs text-[#5F6368]">Pilih varian usaha yang sesuai dengan bisnis Anda</p>
            </div>

            {/* App Cards List (Google Play Store Style Row Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredApps.map((app, index) => {
                const needsUpdate = isUpdateNeeded(app);

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="p-3.5 rounded-2xl border border-[#E8EAED] hover:border-[#DADCE0] hover:shadow-md bg-white transition-all flex items-start gap-3.5 cursor-pointer group"
                  >
                    {/* App Number / Rank */}
                    <span className="text-xs font-bold text-[#5F6368] pt-1 w-4 text-center">
                      {index + 1}
                    </span>

                    {/* App Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={app.logo}
                      alt={app.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#F1F3F4] shadow-sm flex-shrink-0"
                    />

                    {/* App Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#01875f] transition-colors truncate">
                          {app.name}
                        </h3>
                        {needsUpdate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCE8E6] text-[#C5221F] whitespace-nowrap">
                            Update
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#5F6368] truncate mt-0.5">{app.categoryName}</p>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[#5F6368]">
                        <span className="flex items-center gap-0.5 font-bold text-[#202124]">
                          <span>{app.rating}</span>
                          <span className="text-[10px]">★</span>
                        </span>
                        <span>·</span>
                        <span>{app.size}</span>
                        <span>·</span>
                        <span className="text-[#01875f] font-semibold">v{app.latestVersion}+{app.latestBuild}</span>
                      </div>
                    </div>

                    {/* Quick Download / Detail Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(app);
                      }}
                      className="self-center px-4 py-1.5 rounded-full text-xs font-semibold border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#01875f] active:scale-95 transition-all flex-shrink-0"
                    >
                      {needsUpdate ? "Update" : "Install"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlayNusaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Memuat Google Play NUSA...</div>}>
      <PlayNusaStoreContent />
    </Suspense>
  );
}
