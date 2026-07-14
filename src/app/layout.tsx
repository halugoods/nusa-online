import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUSA Kasir — Aplikasi Kasir untuk Toko Kelontong",
  description:
    "Aplikasi Point of Sale modern untuk toko kelontong & UMKM Indonesia. Catat transaksi, kelola stok, pantau keuangan — semua dalam satu aplikasi. Lisensi seumur hidup Rp 150K.",
  keywords: ["kasir", "aplikasi kasir", "POS", "toko kelontong", "UMKM", "Indonesia", "NUSA"],
  openGraph: {
    title: "NUSA Kasir — Aplikasi Kasir untuk Toko Kelontong",
    description:
      "Aplikasi Point of Sale modern untuk toko kelontong & UMKM Indonesia. Lisensi seumur hidup Rp 150K.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
