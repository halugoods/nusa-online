"use client";

import { useEffect, useRef, useState } from "react";

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

// Worker URL — /api/instanpay/{create|status}
const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

const POLL_INTERVAL_MS = 4000;
const QRIS_MAX_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes per InstanPay

// ─── NUSA design system helpers ─────────────────────────────────

function NusaLogo({ app, size = 56 }: { app: AppInfo | null; size?: number }) {
  const color = app?.color ?? "#F97316";
  return (
    <div
      className="mx-auto rounded-full flex items-center justify-center shadow-card"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1A`, // ~10% tint
        fontSize: size * 0.45,
      }}
    >
      <span>{app?.icon ?? "📦"}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function PayPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("lifetime");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  // QRIS state
  const [transactionId, setTransactionId] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [totalAmountFormatted, setTotalAmountFormatted] = useState("");
  const [baseAmountFormatted, setBaseAmountFormatted] = useState("");
  const [countdown, setCountdown] = useState("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const selected = PACKAGES.find((p) => p.id === selectedPackage)!;

  function clearPoll() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  useEffect(() => clearPoll, []);

  async function createPayment(googleId: string) {
    const res = await fetch(`${WORKER_URL}/api/instanpay/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: app!.id,
        package: selectedPackage,
        google_id: googleId,
        customer_name: "Pelanggan NUSA",
      }),
    });
    return res.json();
  }

  async function pollStatus(txId: string) {
    const res = await fetch(`${WORKER_URL}/api/instanpay/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: txId }),
    });
    return res.json();
  }

  async function handlePay() {
    if (!searchParams || !app) return;
    const googleId = searchParams.get("google_id") ?? "";

    if (!googleId) {
      setError("Google ID tidak ditemukan. Silakan login ulang dari aplikasi.");
      return;
    }

    setLoading(true);
    setError("");
    clearPoll();

    try {
      const data = await createPayment(googleId);

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

      // Show QRIS + start polling
      setTransactionId(data.transactionId);
      setQrSvg(data.qrCodeSvg);
      setTotalAmountFormatted(data.totalFormatted ?? `Rp ${data.totalAmount}`);
      setBaseAmountFormatted(data.baseFormatted ?? `Rp ${data.baseAmount}`);

      // Countdown to QRIS expiration (30 min from creation)
      const createdMs = Date.now();
      const ticker = setInterval(() => {
        const remaining = QRIS_MAX_LIFETIME_MS - (Date.now() - createdMs);
        if (remaining <= 0) {
          clearInterval(ticker);
          setError("QRIS telah kedaluwarsa. Silakan buat pembayaran baru.");
          return;
        }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(
          `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }, 1000);

      pollTimer.current = setInterval(async () => {
        try {
          const d = await pollStatus(data.transactionId);
          if (d.success) {
            clearPoll();
            clearInterval(ticker);
            setLicenseKey(d.key ?? "");
            setExpiresAt(d.expires_at ?? "");
            // Signal success back to the Flutter app via URL scheme
            setTimeout(() => {
              window.location.href = `nusa://payment-success?key=${encodeURIComponent(d.key)}`;
            }, 2000);
          } else if (d.status === "EXPIRED") {
            clearPoll();
            clearInterval(ticker);
            setError("Pembayaran telah kedaluwarsa. Silakan buat ulang.");
          }
        } catch (e: any) {
          // transient network — keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const card =
    "w-full max-w-md bg-surface rounded-xl shadow-card border border-subtle";

  // ─── Error / product missing state ───────────────────────────
  if (error && !app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl shadow-card border border-subtle px-8 py-10 max-w-sm">
          <div className="text-5xl mb-4">😞</div>
          <p className="text-gray-900 text-lg font-semibold mb-2">Oops!</p>
          <p className="text-text-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Success: license key generated ──────────────────────────
  if (licenseKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className={card + " text-center p-8"}>
          <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-gray-900 text-xl font-bold mb-2">Pembayaran Berhasil!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Lisensi {app?.name ?? "NUSA"} ({selected.label}) sudah aktif.
            Kembali ke aplikasi untuk mulai menggunakan.
          </p>
          {licenseKey && (
            <div className="bg-input-fill border border-input-border rounded-lg p-4 mb-4 text-left">
              <p className="text-text-tertiary text-xs mb-1">Key Lisensi</p>
              <p className="text-gray-900 font-mono text-sm break-all">{licenseKey}</p>
              {expiresAt && (
                <p className="text-text-tertiary text-xs mt-2">
                  Berlaku sampai {new Date(expiresAt).toLocaleDateString("id-ID")}
                </p>
              )}
            </div>
          )}
          <p className="text-text-tertiary text-xs">
            Lisensi otomatis teraktivasi. Kembali ke aplikasi...
          </p>
        </div>
      </div>
    );
  }

  // ─── QRIS payment shown ──────────────────────────────────────
  if (transactionId && qrSvg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className={card + " text-center p-8"}>
          <NusaLogo app={app} size={48} />
          <h1 className="text-gray-900 text-xl font-bold mt-3 mb-1">Scan QRIS</h1>
          <p className="text-text-secondary text-sm mb-6">
            Bayar dengan aplikasi e-wallet / m-banking mana pun
          </p>

          {/* QR code */}
          <div className="border border-subtle rounded-lg p-3 inline-block mb-4">
            <div
              className="w-56 h-56 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <p className="text-text-tertiary text-xs mb-2">Atau bayar ke</p>
          <p className="text-gray-900 font-mono text-xl font-bold mb-4 break-all">
            {totalAmountFormatted}
          </p>

          <div className="bg-primary-soft rounded-lg p-3 mb-6">
            <p className="text-text-secondary text-xs">
              Harga dasar {baseAmountFormatted} + kode unik. Total yang harus
              dibayar: <span className="text-gray-900 font-semibold">{totalAmountFormatted}</span>
            </p>
            <p className="text-text-secondary text-xs mt-2">
              QRIS berlaku{" "}
              <span className="text-gray-900 font-semibold">{countdown}</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-soft border border-error/20 rounded-lg p-3 mb-4">
              <p className="text-error-text text-sm">{error}</p>
            </div>
          )}

          <p className="text-text-tertiary text-xs animate-pulse">
            Menunggu pembayaran…
          </p>
          {!loading && (
            <button
              onClick={() => handlePay()}
              className="mt-4 w-full py-3 rounded-lg font-semibold text-gray-700 bg-input-fill border border-input-border hover:bg-divider transition-all duration-200"
            >
              🔄 Buat Ulang QRIS
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Package selection ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={card + " p-8"}>
        {/* Header */}
        <div className="text-center mb-8">
          <NusaLogo app={app} size={56} />
          <h1 className="text-gray-900 text-xl font-bold mt-3 mb-1">
            {app?.name ?? "NUSA"}
          </h1>
          <p className="text-text-secondary text-sm">Pilih paket lisensi</p>
        </div>

        {/* Package cards */}
        <div className="space-y-3 mb-6">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedPackage === pkg.id
                  ? "border-primary bg-primary-soft"
                  : "border-input-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">{pkg.label}</span>
                    {pkg.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-medium">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-xs mt-0.5">{pkg.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-bold text-lg">{pkg.priceDisplay}</p>
                </div>
              </div>
              {selectedPackage === pkg.id && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto">
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
          <div className="bg-error-soft border border-error/20 rounded-lg p-3 mb-4">
            <p className="text-error-text text-sm">{error}</p>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-bar disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          style={{ backgroundColor: app?.color ?? "#F97316" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Membuat QRIS...
            </span>
          ) : (
            `Bayar ${selected.priceDisplay}`
          )}
        </button>

        <p className="text-text-tertiary text-xs text-center mt-4">
          Pembayaran aman via InstanPay (QRIS)
        </p>
      </div>
    </div>
  );
}