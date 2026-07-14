"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "6281234567890"; // GANTI dengan nomor WhatsApp kamu
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Halo, saya tertarik dengan NUSA Kasir. Bisa info lebih lanjut?"
);

const features = [
  {
    icon: "🧑‍💼",
    title: "Multi Kasir",
    desc: "Dukungan banyak karyawan dengan role-based access. Owner, Manager, Kasir, Gudang, dan Finance — masing-masing dengan akses yang sesuai.",
  },
  {
    icon: "📊",
    title: "Laporan Real-time",
    desc: "Pantau penjualan, stok, dan keuangan toko secara real-time. Export ke spreadsheet kapan saja.",
  },
  {
    icon: "🛒",
    title: "Toko Online Gratis",
    desc: "Dapatkan halaman toko online gratis di nusa-online.vercel.app. Pelanggan bisa pesan langsung via WhatsApp.",
  },
  {
    icon: "☁️",
    title: "Backup Cloud",
    desc: "Data toko otomatis di-backup ke cloud. Ganti HP? Tinggal restore. Data aman, toko tetap jalan.",
  },
];

const faqs = [
  {
    q: "Apa itu NUSA Kasir?",
    a: "NUSA Kasir adalah aplikasi Point of Sale (POS) untuk toko kelontong dan UMKM di Indonesia. Bisa mencatat transaksi, kelola stok, laporan keuangan, sampai punya toko online sendiri.",
  },
  {
    q: "Berapa harganya?",
    a: "Rp 150.000 untuk lisensi seumur hidup. Satu kali bayar, bisa dipakai di beberapa perangkat dengan akun Google yang sama.",
  },
  {
    q: "Apakah butuh internet?",
    a: "Aplikasi bisa dipakai offline (tanpa internet) untuk transaksi harian. Internet hanya diperlukan saat aktivasi pertama dan sinkronisasi toko online.",
  },
  {
    q: "Bisa dipakai di iPhone?",
    a: "Saat ini NUSA Kasir hanya tersedia di Android. Versi iOS sedang dalam pengembangan.",
  },
  {
    q: "Bagaimana cara dapat key aktivasi?",
    a: "Key aktivasi didapatkan setelah pembelian. Klik tombol Beli Sekarang di atas untuk langsung terhubung via WhatsApp dengan kami.",
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <span className="font-extrabold text-gray-900 text-lg">NUSA</span>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Beli Sekarang
          </a>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-white pb-16">
        <div className="max-w-5xl mx-auto px-4 pt-16 md:pt-24">
          <div className="text-center max-w-2xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-soft text-primary font-semibold text-xs px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Aplikasi Kasir #1 untuk Toko Kelontong
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Kelola Toko Lebih Mudah dengan{" "}
              <span className="text-primary">NUSA Kasir</span>
            </h1>
            <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Aplikasi Point of Sale modern untuk toko kelontong & UMKM
              Indonesia. Catat transaksi, kelola stok, pantau keuangan — semua
              dalam satu aplikasi.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all text-base"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Beli via WhatsApp
              </a>
              <a
                href="#fitur"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3.5 rounded-2xl border border-gray-200 active:scale-[0.98] transition-all text-base"
              >
                Lihat Fitur
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400">
              <span>✓ Lisensi Seumur Hidup</span>
              <span>✓ Support WhatsApp</span>
              <span>✓ Update Gratis</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Fitur ─────────────────────────────────────────────────── */}
      <section id="fitur" className="py-20 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Semua yang Dibutuhkan Toko Anda
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-base">
              NUSA Kasir dirancang khusus untuk kebutuhan toko kelontong dan
              UMKM di Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-primary/20 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Harga ──────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Harga Sederhana, Satu Kali Bayar
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-base">
              Tidak ada biaya bulanan. Tidak ada biaya tersembunyi. Bayar sekali,
              pakai selamanya.
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="relative bg-white rounded-3xl border-2 border-primary p-8 text-center shadow-xl shadow-primary/10">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">
                PALING POPULER
              </div>

              <div className="mt-2 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">Rp 150K</span>
                <span className="text-gray-400 text-sm ml-1">/lisensi</span>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-gray-600 text-left">
                {[
                  "1 lisensi = beberapa perangkat (1 akun Google)",
                  "Semua fitur tanpa batasan",
                  "Toko online gratis (nusa-online.vercel.app)",
                  "Backup & restore cloud",
                  "Support prioritas via WhatsApp",
                  "Update aplikasi gratis selamanya",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-accent-green shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                Beli Sekarang via WhatsApp
              </a>

              <p className="text-xs text-gray-400 mt-3">
                Pembayaran via transfer bank / QRIS
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Cara Aktivasi ──────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Cara Mulai dalam 3 Langkah
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-base">
              Aktivasi NUSA Kasir sangat mudah dan cepat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Beli & Dapatkan Key",
                desc: "Hubungi kami via WhatsApp, lakukan pembayaran, dan dapatkan key aktivasi yang dikirim ke email Anda.",
              },
              {
                step: "2",
                title: "Download & Install",
                desc: "Download NUSA Kasir, buka aplikasi, login dengan akun Google, lalu masukkan key aktivasi.",
              },
              {
                step: "3",
                title: "Setup & Mulai Jualan",
                desc: "Isi data toko, tambahkan produk, dan langsung mulai mencatat transaksi pertama Anda!",
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-lg">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
                {/* Connector line (desktop only) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Pertanyaan Umum
            </h2>
            <p className="text-gray-500 text-sm">
              Ada pertanyaan? Mungkin jawabannya di sini.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className="font-medium text-gray-900 text-sm pr-4">
                    {faq.q}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Bottom ─────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-primary to-primary-dark">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Siap Kelola Toko Lebih Modern?
          </h2>
          <p className="text-red-100 text-sm md:text-base mb-8 max-w-md mx-auto">
            Hubungi kami sekarang dan dapatkan key aktivasi NUSA Kasir dalam
            hitungan menit.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-primary font-bold px-8 py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-10 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">N</span>
              </div>
              <span className="font-bold text-white text-sm">NUSA Kasir</span>
            </div>

            <p className="text-gray-500 text-xs text-center">
              &copy; {new Date().getFullYear()} NUSA — Aplikasi Kasir untuk
              Toko Kelontong Indonesia
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp
              </a>
              <a
                href="mailto:support@halugoods.com"
                className="hover:text-white transition-colors"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
