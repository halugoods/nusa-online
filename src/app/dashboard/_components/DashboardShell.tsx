"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  verifyAdminKey,
  isAuthenticated,
  setAdminKey,
  clearAdminKey,
} from "@/lib/license-manager";

// Tab navigasi dashboard. Setiap tab bisa punya URL sendiri (untuk di-share)
// atau state lokal (sidebar di /dashboard).
const TABS = [
  { id: "overview",  label: "Overview",  href: "/dashboard" },
  { id: "licenses",  label: "Lisensi",   href: "/dashboard?tab=licenses" },
  { id: "generate",  label: "Generate",  href: "/dashboard?tab=generate" },
  { id: "tutorials", label: "Tutorial",  href: "/dashboard?tab=tutorials" },
  { id: "sounds",    label: "Notifikasi", href: "/dashboard/sounds" },
  { id: "audio",     label: "Audio",     href: "/dashboard/audio" },
];

export default function DashboardShell({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab?: string;
}) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Memuat...
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Untuk /dashboard, aktifkan tab berdasarkan query ?tab= atau path.
  const tabFromQuery = searchParams.get("tab");
  const effectiveActive =
    activeTab
    ?? tabFromQuery
    ?? (pathname === "/dashboard/audio" ? "audio"
     : pathname === "/dashboard/sounds" ? "sounds"
     : "overview");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <h1 className="font-bold text-gray-900 text-sm">NUSA Admin</h1>
          </a>
          <button
            onClick={() => {
              clearAdminKey();
              setAuthed(false);
            }}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map((t) => {
            const isActive = effectiveActive === t.id;
            return (
              <a
                key={t.id}
                href={t.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const ok = await verifyAdminKey(key.trim());
      if (ok) {
        setAdminKey(key.trim());
        onLogin();
      } else {
        setError("Admin key salah");
      }
    } catch (err: any) {
      setError(err.message ?? "Gagal memverifikasi");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm shadow-sm"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-bold">N</span>
          </div>
          <h1 className="font-bold text-gray-900">NUSA Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Masukkan admin key untuk melanjutkan</p>
        </div>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          autoFocus
        />
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading || !key}
          className="w-full mt-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Memverifikasi..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
