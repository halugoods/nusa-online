"use client";

import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🏪</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Toko Online <span className="text-primary">NUSA</span>
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Platform toko online gratis untuk pemilik toko kelontong.
          Ditenagai oleh aplikasi kasir NUSA.
        </p>

        <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            Punya toko? Download NUSA Kasir
          </p>
          <a
            href="https://github.com/halugoods/nusa-kasir/releases"
            target="_blank"
            rel="noopener"
            className="inline-block bg-primary text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            Download APK
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          &copy; {new Date().getFullYear()} NUSA — Aplikasi Kasir Indonesia
        </p>
      </div>
    </div>
  );
}
