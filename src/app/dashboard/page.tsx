"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  getMinVersions,
  setMinVersion,
  PRODUCTS,
  TIERS,
  type LicenseRecord,
  type LicenseDetail,
  type LicenseStats,
  type LicenseTier,
  type ActivationRecord,
  type MinVersionRecord,
} from "@/lib/license-manager";
import {
  listTutorials,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  uploadThumbnail,
  type TutorialRecord,
} from "@/lib/tutorial-manager";
import {
  SOUND_SLOTS,
  fetchManifest,
  soundPublicUrl,
  uploadSound,
  resetSound,
  type SoundsManifest,
} from "@/lib/sound-manager";
import DashboardShell from "./_components/DashboardShell";
import NotifikasiTab from "./_components/NotifikasiTab";

// ─── Types ────────────────────────────────────────────────────────────

type View = "overview" | "licenses" | "generate" | "tutorials" | "sounds";

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

// v2.2.57: device dianggap stale kalau tidak pernah ping > 7 hari.
function isStale(lastSeenIso?: string | null): boolean {
  if (!lastSeenIso) return false;
  return Date.now() - new Date(lastSeenIso).getTime() > 7 * 24 * 60 * 60 * 1000;
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


// ─── Dashboard ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [view, setView] = useState<View>("overview");

  return (
    <DashboardShell>
      {/* Sidebar tabs (local state — Overview/Lisensi/Generate/Tutorial via
          client switch; tab Audio/Sounds punya URL sendiri). */}
      <div className="mb-4 flex gap-0 border-b border-gray-100 -mx-1">
        {([
          { v: "overview" as View, label: "Overview" },
          { v: "licenses" as View, label: "Lisensi" },
          { v: "generate" as View, label: "Generate" },
          { v: "tutorials" as View, label: "Tutorial" },
          { v: "sounds" as View, label: "Notifikasi" },
        ]).map((t) => (
          <button
            key={t.v}
            onClick={() => setView(t.v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === t.v
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <a
          href="/dashboard/audio"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors"
        >
          Audio ↗
        </a>
      </div>

      {view === "overview" && <OverviewTab />}
      {view === "licenses" && <LicensesTab />}
      {view === "generate" && <GenerateTab />}
      {view === "tutorials" && <TutorialsTab />}
      {view === "sounds" && <NotifikasiTab />}
    </DashboardShell>
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

      {/* v2.2.57: editor versi minimum per produk (force-update) */}
      <MinVersionsCard />

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
                          {!lic.google_user_id &&
                            (lic.status === "Active" || lic.status === "Trial") && (
                              <span
                                className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700"
                                title="Lisensi terpakai di app tapi belum ter-link akun Google — revoke tidak akan memblokir device manapun sampai di-link"
                              >
                                belum link
                              </span>
                            )}
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

// ─── v2.2.57: Versi Minimum App per produk (force-update) ────────────

function MinVersionsCard() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MinVersionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  // draft per produk: {version, build, url}
  const [draft, setDraft] = useState<Record<string, { v: string; b: string; u: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await getMinVersions();
      setRows(list);
      const d: Record<string, { v: string; b: string; u: string }> = {};
      for (const r of list) d[r.product] = { v: r.min_version, b: String(r.min_build), u: r.download_url ?? "" };
      setDraft(d);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open && rows.length === 0 && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(product: string) {
    const cur = draft[product];
    if (!cur) return;
    setSaving(product);
    try {
      await setMinVersion(product, cur.v, Number(cur.b) || 0, cur.u || null);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(null);
  }

  return (
    <div className="bg-white border border-input-border rounded-2xl mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-semibold text-gray-900 text-sm">Versi Minimum App (Update Wajib)</p>
          <p className="text-xs text-gray-400 mt-0.5">
            App di bawah build minimum akan diblokir & diminta update via browser
          </p>
        </div>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3">
          {loading && <p className="text-xs text-gray-400">Memuat…</p>}
          {PRODUCTS.map((p) => {
            const cur = draft[p.id] ?? { v: "", b: "", u: "" };
            const existing = rows.find((r) => r.product === p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-gray-800 w-24 shrink-0">{p.name}</span>
                <input
                  value={cur.v}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...cur, v: e.target.value } })}
                  placeholder="2.2.57"
                  className="w-20 px-2 py-1.5 border border-input-border rounded-lg text-xs"
                />
                <input
                  value={cur.b}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...cur, b: e.target.value.replace(/\D/g, "") } })}
                  placeholder="build"
                  className="w-16 px-2 py-1.5 border border-input-border rounded-lg text-xs"
                />
                <input
                  value={cur.u}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...cur, u: e.target.value } })}
                  placeholder="URL download APK (opsional)"
                  className="flex-1 min-w-[180px] px-2 py-1.5 border border-input-border rounded-lg text-xs"
                />
                <button
                  onClick={() => save(p.id)}
                  disabled={saving === p.id}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
                >
                  {saving === p.id ? "…" : existing ? "Update" : "Set"}
                </button>
                {existing && (
                  <span className="text-[10px] text-green-600 font-medium">aktif</span>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-gray-400">
            Kosongkan build (= 0) lalu simpan untuk mematikan force-update produk tsb.
          </p>
        </div>
      )}
    </div>
  );
}

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
            {/* v2.2.57: versi app terakhir yang dipakai perangkat */}
            <DetailRow label="Versi App">
              {license.last_app_build ? (
                <span className="inline-flex items-center gap-2">
                  <span>
                    v{license.last_app_version || "?"} (build {license.last_app_build})
                  </span>
                  {isStale(license.last_seen_at) && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      Stale
                    </span>
                  )}
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            {license.last_seen_at && (
              <DetailRow label="Terakhir Online" value={formatDate(license.last_seen_at)} />
            )}
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

// ─── Tutorials Tab ────────────────────────────────────────────────────

function TutorialsTab() {
  const [tutorials, setTutorials] = useState<TutorialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TutorialRecord | null>(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setTutorials(await listTutorials());
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Yakin mau hapus tutorial ini?")) return;
    try {
      await deleteTutorial(id);
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Video Tutorial</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Kelola video panduan (YouTube). Pilih varian (boleh lebih dari satu) supaya app menampilkan tutorial yang sesuai.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors text-sm"
        >
          + Tambah Tutorial
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {showForm && (
        <TutorialForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}

      {tutorials.length === 0 && !error ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Belum ada tutorial. Klik "+ Tambah Tutorial" untuk mulai.
        </div>
      ) : (
        <div className="space-y-3">
          {tutorials.map((t) => {
            const variantNames = t.variants
              .map((v) => PRODUCTS.find((p) => p.id === v)?.name ?? v)
              .join(", ");
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                {t.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.thumbnail_url}
                    alt={t.title}
                    className="w-32 h-20 object-cover rounded-lg shrink-0 bg-gray-100"
                  />
                ) : (
                  <div className="w-32 h-20 rounded-lg shrink-0 bg-gray-100 flex items-center justify-center text-2xl">
                    🎬
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate" title={t.title}>{t.title}</p>
                  <a href={t.yt_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
                    {t.yt_url}
                  </a>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Varian: {variantNames || "(semua / belum dipilih)"} · urutan {t.sort_order}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(t); setShowForm(true); }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors text-left"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-3 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TutorialForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: TutorialRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [ytUrl, setYtUrl] = useState(editing?.yt_url ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
  const [variants, setVariants] = useState<string[]>(editing?.variants ?? []);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(editing?.thumbnail_url ?? null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  const [file, setFile] = useState<File | null>(null);

  function toggleVariant(id: string) {
    setVariants((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Preview lokal
    setThumbnailUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !ytUrl.trim()) return;
    setSaving(true);
    setBusy("");
    try {
      let thumb = thumbnailUrl;
      if (file) {
        const key = `tut-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
        thumb = await uploadThumbnail(file, key);
      }
      const payload = {
        title: title.trim(),
        yt_url: ytUrl.trim(),
        description: description.trim() || null,
        thumbnail_url: thumb,
        variants,
        sort_order: parseInt(sortOrder) || 0,
      };
      if (editing) {
        await updateTutorial(editing.id, payload);
      } else {
        await createTutorial(payload);
      }
      onSaved();
    } catch (err: any) {
      setBusy(err.message ?? "Gagal menyimpan");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{editing ? "Edit Tutorial" : "Tambah Tutorial"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Judul</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Cara Checkout & Cetak Struk" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Link YouTube</label>
          <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} required
            className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="https://youtube.com/shorts/xxxx" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Ringkasan singkat tutorial..." />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Thumbnail <span className="text-gray-400 font-normal">(opsional)</span></label>
          <input type="file" accept="image/*" onChange={handleFile}
            className="text-sm" />
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="preview" className="mt-2 w-40 h-24 object-cover rounded-lg bg-gray-100" />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tampilkan di varian aplikasi</label>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={variants.includes(p.id)}
                  onChange={() => toggleVariant(p.id)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-gray-700">{p.name}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">Pilih satu atau lebih. Kosongkan kalau mau tampil di semua varian.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Urutan <span className="text-gray-400 font-normal">(kecil = tampil duluan)</span></label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-4 py-2.5 border border-input-border rounded-xl text-sm" />
        </div>

        {busy && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{busy}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm">
            {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

