"use client";

import { useState, useEffect, useCallback } from "react";
import {
  verifyAdminKey,
  setAdminKey,
  clearAdminKey,
  isAuthenticated,
  getStats,
  listLicenses,
  getLicenseDetail,
  generateKeys,
  revokeLicense,
  deleteLicense,
  PRODUCTS,
  TIERS,
  type LicenseRecord,
  type LicenseDetail,
  type LicenseStats,
  type LicenseTier,
  type ActivationRecord,
} from "@/lib/license-manager";

// ─── Types ────────────────────────────────────────────────────────────

type View = "overview" | "licenses" | "generate";

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "Generated":
      return { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", label: "Generated" };
    case "Trial":
      return { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Trial" };
    case "Active":
      return { bg: "bg-green-50 text-green-700 border-green-200", text: "text-green-700", label: "Aktif" };
    case "Cancelled":
      return { bg: "bg-red-50 text-red-700 border-red-200", text: "text-red-700", label: "Cancelled" };
    case "Expired":
      return { bg: "bg-gray-50 text-gray-500 border-gray-200", text: "text-gray-500", label: "Expired" };
    case "Suspended":
      return { bg: "bg-orange-50 text-orange-700 border-orange-200", text: "text-orange-700", label: "Suspended" };
    default:
      return { bg: "bg-gray-50 text-gray-700 border-gray-200", text: "text-gray-700", label: status };
  }
}

function tierBadge(tier: string): { label: string; bg: string } {
  switch (tier) {
    case "trial":
      return { label: "Trial 3H", bg: "bg-amber-100 text-amber-800" };
    case "1month":
      return { label: "Bulanan", bg: "bg-blue-100 text-blue-800" };
    case "lifetime":
      return { label: "Lifetime", bg: "bg-purple-100 text-purple-800" };
    default:
      return { label: tier, bg: "bg-gray-100 text-gray-700" };
  }
}

function productName(productId: string): string {
  return PRODUCTS.find((p) => p.id === productId)?.name ?? productId;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ─── Pesan otomatis untuk pembeli (Shopee) ────────────────────────────

const PRODUCT_APP_NAMES: Record<string, string> = {
  "nusa-kelontong": "NUSA Kelontong",
  "nusa-fnb": "NUSA F&B",
  "nusa-laundry": "NUSA Laundry",
  "nusa-bengkel": "NUSA Bengkel",
  "nusa-salon": "NUSA Salon",
  "nusa-apotek": "NUSA Apotek",
  "nusa-fotocopy": "NUSA Fotocopy",
  "nusa-servis": "NUSA Servis",
};

function buildBuyerMessage(opts: {
  buyerName: string;
  productId: string;
  key: string;
  mode: "standar" | "singkat";
}): string {
  const appName = PRODUCT_APP_NAMES[opts.productId] ?? "NUSA";
  const buyer = opts.buyerName?.trim() || "";
  const greeting = buyer ? `Halo Kak ${buyer}!` : "Halo Kak!";

  if (opts.mode === "singkat") {
    return [
      `${greeting} Ini key aktivasi ${appName} Anda:`,
      "",
      `🔑 ${opts.key}`,
      "",
      `Cara: buka app → Masuk dengan Google → "Sudah punya lisensi key" → masukkan key di atas. Simpan baik-baik ya. Terima kasih! 🙏`,
    ].join("\n");
  }

  return [
    `${greeting} 🙏`,
    "",
    `Terima kasih sudah membeli ${appName} di toko kami.`,
    "",
    "Berikut key aktivasi Anda:",
    "",
    `🔑 Key Aktivasi: ${opts.key}`,
    "",
    "📲 Cara Aktivasi:",
    `1. Download & install aplikasi ${appName} (link sudah dikirim otomatis oleh Shopee).`,
    '2. Buka aplikasi → pilih "Masuk dengan Google".',
    '3. Pilih "Sudah punya lisensi key" → masukkan key di atas.',
    "4. Ikuti setup nama toko & selesai! 🎉",
    "",
    "📌 Catatan:",
    "• Key bisa dipakai di beberapa perangkat, selama pakai akun Google yang sama.",
    "• Simpan key ini baik-baik — jika hilang, hubungi kami.",
    "",
    "Kalau ada kendala, balas chat ini ya. Terima kasih! 😊",
  ].join("\n");
}

// ─── Login Screen ─────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    const ok = await verifyAdminKey(key.trim());
    if (ok) {
      setAdminKey(key.trim());
      onLogin();
    } else {
      setError("Admin key tidak valid");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white text-2xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">NUSA Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Manajemen Lisensi Aktivasi</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border-subtle p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Masukkan admin key..."
              className="w-full px-4 py-2.5 border border-input-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("overview");

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <h1 className="font-bold text-gray-900 text-sm">NUSA Admin</h1>
          </div>
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
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          {(["overview", "licenses", "generate"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === v
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "overview" ? "Overview" : v === "licenses" ? "Lisensi" : "Generate"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === "overview" && <OverviewTab />}
        {view === "licenses" && <LicensesTab />}
        {view === "generate" && <GenerateTab />}
      </main>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500 text-sm">{error}</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Lisensi", value: stats.total, color: "bg-blue-50 text-blue-700" },
    { label: "Generated (Belum Aktif)", value: stats.Generated ?? 0, color: "bg-amber-50 text-amber-700" },
    { label: "Trial", value: stats.Trial ?? 0, color: "bg-yellow-50 text-yellow-700" },
    { label: "Aktif", value: stats.Active ?? 0, color: "bg-green-50 text-green-700" },
    { label: "Cancelled", value: stats.Cancelled ?? 0, color: "bg-red-50 text-red-700" },
    { label: "Expired", value: stats.Expired ?? 0, color: "bg-gray-50 text-gray-600" },
    { label: "Suspended", value: stats.Suspended ?? 0, color: "bg-orange-50 text-orange-700" },
    { label: "Total Aktivasi", value: stats.total_activations ?? 0, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Overview Lisensi</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Licenses Tab ─────────────────────────────────────────────────────

function LicensesTab() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<LicenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const limit = 30;

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listLicenses(
        page, limit,
        statusFilter || undefined,
        search || undefined,
        productFilter || undefined,
        tierFilter || undefined,
      );
      setLicenses(res.licenses);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [page, statusFilter, productFilter, tierFilter, search]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  async function handleViewDetail(id: string) {
    setDetailLoading(true);
    try {
      const detail = await getLicenseDetail(id);
      setSelectedLicense(detail);
    } catch (e: any) {
      setError(e.message);
    }
    setDetailLoading(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Yakin mau revoke lisensi ini? App yang sudah aktif akan berhenti bekerja.")) return;
    try {
      await revokeLicense(id);
      fetchLicenses();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin mau hapus lisensi ini?")) return;
    try {
      await deleteLicense(id);
      fetchLicenses();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Daftar Lisensi</h2>

      {/* Detail Modal */}
      {selectedLicense && (
        <LicenseDetailModal
          license={selectedLicense}
          onClose={() => setSelectedLicense(null)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-input-border rounded-xl text-sm bg-white"
        >
          <option value="">Semua Status</option>
          <option value="Generated">Generated</option>
          <option value="Trial">Trial</option>
          <option value="Active">Aktif</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Expired">Expired</option>
          <option value="Suspended">Suspended</option>
        </select>

        <select
          value={productFilter}
          onChange={(e) => { setProductFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-input-border rounded-xl text-sm bg-white"
        >
          <option value="">Semua Produk</option>
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-input-border rounded-xl text-sm bg-white"
        >
          <option value="">Semua Tier</option>
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(0); }}
          className="flex gap-2 flex-1 min-w-[200px]"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari key atau email..."
            className="flex-1 px-3 py-2 border border-input-border rounded-xl text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Table */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
      ) : licenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Tidak ada lisensi ditemukan.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Key</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Produk</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Tier</th>
                    <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Pemilik</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tanggal</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {licenses.map((lic) => {
                    const badge = statusBadge(lic.status);
                    const tb = tierBadge(lic.tier);
                    return (
                      <tr key={lic.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                            {lic.key.length > 18 ? lic.key.slice(0, 18) + "..." : lic.key}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-700">
                            {productName(lic.product)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tb.bg}`}>
                            {tb.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          {lic.owner_email || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                          {formatDate(lic.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleViewDetail(lic.id)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                            {lic.status !== "Cancelled" && lic.status !== "Expired" && lic.status !== "Suspended" && (
                              <button
                                onClick={() => handleRevoke(lic.id)}
                                className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            {lic.status === "Generated" && (lic.activation_count ?? 0) === 0 && (
                              <button
                                onClick={() => handleDelete(lic.id)}
                                className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500">
                {page * limit + 1}–{Math.min((page + 1) * limit, total)} dari {total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 border border-input-border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 border border-input-border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl p-6 shadow-lg text-sm text-gray-500">
            Memuat detail...
          </div>
        </div>
      )}
    </div>
  );
}

// ─── License Detail Modal ─────────────────────────────────────────────

function LicenseDetailModal({
  license,
  onClose,
}: {
  license: LicenseDetail;
  onClose: () => void;
}) {
  const badge = statusBadge(license.status);
  const tb = tierBadge(license.tier);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Detail Lisensi</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <DetailRow label="Status">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                {badge.label}
              </span>
            </DetailRow>
            <DetailRow label="Key">
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono break-all">
                {license.key}
              </code>
              <button
                onClick={() => copyToClipboard(license.key)}
                className="ml-2 text-xs text-primary hover:underline"
              >
                Copy
              </button>
            </DetailRow>
            <DetailRow label="Serial" value={license.serial} />
            <DetailRow label="Produk" value={productName(license.product)} />
            <DetailRow label="Tier">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tb.bg}`}>
                {tb.label}
              </span>
            </DetailRow>
            <DetailRow label="Pemilik" value={license.owner_email ?? "—"} />
            <DetailRow label="Google ID" value={license.google_user_id ?? "—"} />
            <DetailRow label="Dibuat" value={formatDate(license.created_at)} />
          </div>

          {/* Activations */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">
              Aktivasi ({license.activations?.length ?? 0})
            </h4>
            {(!license.activations || license.activations.length === 0) ? (
              <p className="text-xs text-gray-400">Belum ada aktivasi</p>
            ) : (
              <div className="space-y-2">
                {license.activations.map((act) => (
                  <div key={act.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <p className="font-mono text-gray-700">{act.device_id}</p>
                    <p className="text-gray-400 mt-0.5">{formatDate(act.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right font-medium break-all">
        {children ?? value ?? "—"}
      </span>
    </div>
  );
}

// ─── Generate Tab ─────────────────────────────────────────────────────

function GenerateTab() {
  const [count, setCount] = useState(1);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [product, setProduct] = useState("nusa-kelontong");
  const [tier, setTier] = useState<LicenseTier>("lifetime");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; keys: string[]; product?: string; tier?: string; expires_at?: string; email_sent?: boolean; email_error?: string } | null>(null);
  const [error, setError] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  // Manual key add form
  const [manualKey, setManualKey] = useState("");
  const [manualSerial, setManualSerial] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualProduct, setManualProduct] = useState("nusa-kelontong");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setActiveMessageIndex(null);
    try {
      const res = await generateKeys(count, ownerEmail || undefined, buyerName || undefined, sendEmail && !!ownerEmail, product, tier);
      setResult(res);
      // Auto-buka pesan key pertama setelah generate berhasil
      if (res.keys?.length) setActiveMessageIndex(0);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // Pesan otomatis per key untuk pembeli (Shopee)
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);
  const [messageMode, setMessageMode] = useState<"standar" | "singkat">("standar");

  async function copyMessage(key: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const msg = buildBuyerMessage({
      buyerName,
      productId: product,
      key,
      mode: messageMode,
    });
    await navigator.clipboard.writeText(msg);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualKey.trim() || !manualSerial.trim()) return;
    setManualLoading(true);
    setManualResult("");
    try {
      const { addKey } = await import("@/lib/license-manager");
      await addKey(manualKey.trim(), manualSerial.trim(), manualEmail || undefined, manualProduct);
      setManualResult("Key berhasil ditambahkan!");
      setManualKey("");
      setManualSerial("");
      setManualEmail("");
    } catch (e: any) {
      setManualResult(e.message);
    }
    setManualLoading(false);
  }

  async function copyAllKeys() {
    if (!result) return;
    await navigator.clipboard.writeText(result.keys.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  const selectedProductName = PRODUCTS.find((p) => p.id === product)?.name ?? product;
  const selectedTierData = TIERS.find((t) => t.id === tier);

  return (
    <div className="space-y-8">
      {/* Auto Generate */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Generate Key Baru</h2>
        <p className="text-xs text-gray-500 mb-4">
          Generate key aktivasi dengan produk dan tier yang dipilih.
        </p>

        <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Produk / Aplikasi
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tier / Paket
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as LicenseTier)}
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                {TIERS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Jumlah Key
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Buyer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Pembeli <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Pembeli <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="pembeli@email.com"
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Send Email */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={!ownerEmail}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 accent-primary"
                />
                <span className="text-sm text-gray-700">
                  Kirim key via Email{!ownerEmail ? " (isi email dulu)" : ""}
                </span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Generating..." : `Generate Key untuk ${selectedProductName}`}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-white rounded-xl border border-green-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-green-700">
                  ✅ {result.count} key berhasil di-generate
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Produk: {productName(result.product ?? "")} · Tier: {TIERS.find((t) => t.id === result.tier)?.label ?? result.tier}
                </p>
                {result.expires_at && (
                  <span className="inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    ⏳ Expires: {new Date(result.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              <button
                onClick={copyAllKeys}
                className="text-xs text-primary hover:underline shrink-0"
              >
                {copiedAll ? "Copied!" : "Copy Semua"}
              </button>
            </div>

            {/* Email status */}
            {ownerEmail && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
                result.email_sent
                  ? "bg-green-50 text-green-700"
                  : result.email_error
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-50 text-gray-500"
              }`}>
                {result.email_sent
                  ? `📧 Key berhasil dikirim ke ${ownerEmail}`
                  : result.email_error
                  ? `⚠️ Gagal kirim email: ${result.email_error}`
                  : sendEmail
                  ? "⏳ Email tidak terkirim (cek konfigurasi Resend)"
                  : "ℹ️ Email tidak dikirim (centang 'Kirim key via Email' untuk mengirim)"}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
              {result.keys.map((k, i) => (
                <code key={i} className="block text-xs font-mono text-gray-700 py-0.5">
                  {k}
                </code>
              ))}
            </div>

            {/* ── Pesan otomatis untuk pembeli (Shopee) ── */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-xs font-medium text-gray-600">
                  💬 Pesan otomatis untuk pembeli ({productName(result.product ?? "")})
                </p>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(["standar", "singkat"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMessageMode(m)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        messageMode === m
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {m === "standar" ? "Standar" : "Singkat"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih key mana yang pesannya mau disalin */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {result.keys.map((k, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMessageIndex(i)}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      activeMessageIndex === i
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Key {i + 1}
                  </button>
                ))}
              </div>

              {activeMessageIndex !== null && result.keys[activeMessageIndex] && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <p className="text-[11px] text-gray-500">
                      Salin & kirim ke pembeli (mode {messageMode})
                    </p>
                    <button
                      onClick={(e) => copyMessage(result.keys[activeMessageIndex], e)}
                      className={`text-[11px] font-medium transition-colors ${
                        messageCopied ? "text-green-600" : "text-primary hover:underline"
                      }`}
                    >
                      {messageCopied ? "✓ Copied!" : "Copy Pesan"}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-700 px-3 py-3 bg-white font-sans leading-relaxed">
                    {buildBuyerMessage({
                      buyerName,
                      productId: product,
                      key: result.keys[activeMessageIndex],
                      mode: messageMode,
                    })}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Manual Add (for keygen.dart keys) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Tambah Key Manual</h2>
        <p className="text-xs text-gray-500 mb-4">
          Tambahkan key yang sudah di-generate via keygen.dart CLI ke database.
        </p>

        <form onSubmit={handleAddManual} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Key Aktivasi
            </label>
            <input
              type="text"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="NUSA-XXXX-XXXX-XXXX..."
              className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Serial (8 karakter)
            </label>
            <input
              type="text"
              value={manualSerial}
              onChange={(e) => setManualSerial(e.target.value)}
              placeholder="XXXXXXXX"
              maxLength={8}
              className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Produk
              </label>
              <select
                value={manualProduct}
                onChange={(e) => setManualProduct(e.target.value)}
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Pembeli <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="pembeli@email.com"
                className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {manualResult && (
            <p className={`text-sm px-3 py-2 rounded-lg ${
              manualResult.includes("berhasil")
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}>
              {manualResult}
            </p>
          )}

          <button
            type="submit"
            disabled={manualLoading}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {manualLoading ? "Menambahkan..." : "Tambah Key"}
          </button>
        </form>
      </div>
    </div>
  );
}
