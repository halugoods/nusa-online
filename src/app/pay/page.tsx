"use client";

import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────

interface Package {
  id: string;
  label: string;
  price: number;
  priceDisplay: string;
  duration: string;
  badge?: string;
}

interface AppInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const APPS: Record<string, AppInfo> = {
  "nusa-kelontong": { id: "nusa-kelontong", name: "NUSA Kelontong", color: "#F97316", icon: "🍚" },
  "nusa-fnb": { id: "nusa-fnb", name: "NUSA F&B", color: "#DC2626", icon: "🍜" },
  "nusa-laundry": { id: "nusa-laundry", name: "NUSA Laundry", color: "#EC4899", icon: "👕" },
  "nusa-bengkel": { id: "nusa-bengkel", name: "NUSA Bengkel", color: "#EAB308", icon: "🔧" },
  "nusa-salon": { id: "nusa-salon", name: "NUSA Salon", color: "#3B82F6", icon: "💇" },
  "nusa-apotek": { id: "nusa-apotek", name: "NUSA Apotek", color: "#10B981", icon: "💊" },
  "nusa-fotocopy": { id: "nusa-fotocopy", name: "NUSA Fotocopy", color: "#8B5CF6", icon: "🖨️" },
  "nusa-servis": { id: "nusa-servis", name: "NUSA Servis", color: "#152C63", icon: "📱" },
};

const PACKAGES: Package[] = [
  {
    id: "1bulan",
    label: "1 Bulan",
    price: 49000,
    priceDisplay: "Rp49.000",
    duration: "30 hari akses penuh",
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: 249000,
    priceDisplay: "Rp249.000",
    duration: "Akses seumur hidup",
    badge: "Best Value",
  },
];

// Supabase URL — hardcoded (same as vercel.json)
const SUPABASE_URL = "https://sakeuhcbcnueplzlkltm.supabase.co";

// ─── Page ────────────────────────────────────────────────────────

export default function PayPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("lifetime");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapToken, setSnapToken] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showSnap, setShowSnap] = useState(false);

  // Parse query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams(params);
    const product = params.get("product") ?? "";
    const found = APPS[product] ?? null;
    setApp(found);
    if (!found) setError("Produk tidak ditemukan. Gunakan link yang valid.");
    if (params.get("package")) {
      setSelectedPackage(params.get("package")!);
    }
  }, []);

  // Load Midtrans Snap.js (sandbox)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "SB-Mid-client-TIVMYMEz-xO1Lo_j");
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const selected = PACKAGES.find((p) => p.id === selectedPackage)!;

  async function handlePay() {
    if (!searchParams || !app) return;
    const googleId = searchParams.get("google_id") ?? "";

    if (!googleId) {
      setError("Google ID tidak ditemukan. Silakan login ulang dari aplikasi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Get snap token from edge function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/midtrans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNha2V1aGNiY251ZXBsemxrbHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIzMDEsImV4cCI6MjA5OTI1ODMwMX0.WvjZJ8Sd3o5T8a4vMApyvoCoS01Qv493mo1PxyWO06M`,
        },
        body: JSON.stringify({
          action: "get_token",
          product: app.id,
          package: selectedPackage,
          google_id: googleId,
          customer_name: "Pelanggan NUSA",
          customer_email: "pelanggan@nusa.app",
        }),
      });

      const data = await res.json();

      if (data.error === "already_active") {
        setLicenseKey(data.key ?? "");
        setExpiresAt(data.expires_at ?? "");
        setError("Anda sudah memiliki lisensi aktif! Silakan kembali ke aplikasi.");
        return;
      }

      if (data.error) {
        setError(data.message ?? data.error);
        return;
      }

      setSnapToken(data.token);
      setShowSnap(true);

      // 2. Open Midtrans Snap popup
      if ((window as any).snap) {
        (window as any).snap.pay(data.token, {
          onSuccess: async function (result: any) {
            setShowSnap(false);
            await handleVerify(result.order_id);
          },
          onPending: function (result: any) {
            setShowSnap(false);
            setError(
              `Pembayaran pending. Status: ${result.transaction_status}. Silakan cek kembali atau hubungi kami.`
            );
          },
          onError: function (result: any) {
            setShowSnap(false);
            setError(`Pembayaran gagal: ${result.status_message}`);
          },
          onClose: function () {
            setShowSnap(false);
            if (!licenseKey) {
              setError("Pembayaran dibatalkan.");
            }
          },
        });
      } else {
        setError("Midtrans Snap gagal dimuat. Coba lagi.");
      }
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(orderId: string) {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/midtrans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNha2V1aGNiY251ZXBsemxrbHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODIzMDEsImV4cCI6MjA5OTI1ODMwMX0.WvjZJ8Sd3o5T8a4vMApyvoCoS01Qv493mo1PxyWO06M`,
        },
        body: JSON.stringify({ action: "verify", order_id: orderId }),
      });

      const data = await res.json();

      if (data.success) {
        setLicenseKey(data.key);
        setExpiresAt(data.expires_at ?? "");
        // Signal success back to the Flutter app via URL scheme
        const flutterUrl = `nusa://payment-success?key=${encodeURIComponent(data.key)}`;
        setTimeout(() => {
          window.location.href = flutterUrl;
        }, 2000);
      } else {
        setError(data.message ?? "Verifikasi pembayaran gagal");
      }
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ─── Error state ───────────────────────────────────────────────
  if (error && !app) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😞</div>
          <p className="text-white text-lg font-semibold mb-2">Oops!</p>
          <p className="text-white/60 text-sm max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Success: license key generated ──────────────────────────
  if (licenseKey) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Pembayaran Berhasil!</h2>
          <p className="text-white/60 text-sm mb-6">
            Lisensi {app?.name ?? "NUSA"} ({selected.label}) sudah aktif.
            Kembali ke aplikasi untuk mulai menggunakan.
          </p>
          {licenseKey && (
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-white/40 text-xs mb-1">Key Lisensi</p>
              <p className="text-white font-mono text-sm break-all">{licenseKey}</p>
              {expiresAt && (
                <p className="text-white/40 text-xs mt-2">
                  Berlaku sampai {new Date(expiresAt).toLocaleDateString("id-ID")}
                </p>
              )}
            </div>
          )}
          <p className="text-white/40 text-xs">
            Lisensi otomatis teraktivasi. Kembali ke aplikasi...
          </p>
        </div>
      </div>
    );
  }

  // ─── Package selection ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">{app?.icon ?? "📦"}</div>
          <h1 className="text-white text-xl font-bold mb-1">
            {app?.name ?? "NUSA"}
          </h1>
          <p className="text-white/50 text-sm">Pilih paket lisensi</p>
        </div>

        {/* Package cards */}
        <div className="space-y-3 mb-6">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedPackage === pkg.id
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{pkg.label}</span>
                    {pkg.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 font-medium">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{pkg.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">{pkg.priceDisplay}</p>
                </div>
              </div>
              {selectedPackage === pkg.id && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center ml-auto">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: app?.color ?? "#F97316" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {showSnap ? "Menunggu pembayaran..." : "Memproses..."}
            </span>
          ) : (
            `Bayar ${selected.priceDisplay}`
          )}
        </button>

        <p className="text-white/30 text-xs text-center mt-4">
          Pembayaran aman via Midtrans
        </p>
      </div>
    </div>
  );
}
