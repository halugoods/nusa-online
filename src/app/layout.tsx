import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUSA — Aplikasi Kasir untuk Semua Bisnis",
  description:
    "Satu ekosistem, delapan aplikasi kasir. Pilih NUSA yang sesuai dengan bisnis Anda: Kelontong, F&B, Laundry, Bengkel, Salon, Apotek, Fotocopy, atau Service HP. Trial gratis 3 hari.",
  keywords: ["kasir", "aplikasi kasir", "POS", "toko kelontong", "UMKM", "Indonesia", "NUSA", "F&B", "laundry", "bengkel", "salon", "apotek", "fotocopy", "service HP"],
  openGraph: {
    title: "NUSA — Aplikasi Kasir untuk Semua Bisnis",
    description: "Satu ekosistem, delapan aplikasi kasir. Trial gratis 3 hari. Lisensi mulai Rp 49K/bulan atau Rp 249K seumur hidup.",
    type: "website", locale: "id_ID",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-text-primary min-h-screen">{children}</body>
    </html>
  );
}
