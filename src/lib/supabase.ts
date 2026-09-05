// v2.2.57+130 (Milestone D): pembacaan publik storefront pindah dari
// PostgREST langsung ke worker Cloudflare (/api/online-store/*). Nama file
// dan SEMUA export tetap sama supaya konsumen (halaman toko, ProductCard)
// tidak perlu diubah — hanya isi fetch-nya yang ganti.
//
// Worker: POST /api/online-store/{action} dengan body JSON 1:1 edge fn lama.

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

async function callFn<T>(action: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/online-store/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── WA normalize (adaptasi GAS normalizePhoneTo08 + formatWA) ──────
// Simpan selalu bentuk 08xx (strip non-digit, 62→0, 8→08).
export function normalizePhoneTo08(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("62")) return "0" + clean.substring(2);
  if (clean.startsWith("8")) return "0" + clean;
  return clean;
}
// wa.me butuh 62xx — 08xx → 62xx.
export function formatWA(phone: string): string {
  const n = normalizePhoneTo08(phone);
  if (!n) return "";
  return "62" + n.substring(1);
}

// ─── Data types ─────────────────────────────────────────────────────
export interface StoreSettings {
  store_id: string;
  store_name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  whatsapp: string;
  address: string;
  open_hours: string;
  is_active: boolean;
  slug?: string;
  variant?: string;
  theme_id?: string;
  primary_color?: string;
  dark_color?: string;
  soft_color?: string;
  // Rilis besar v2.2.23 (C1):
  order_types?: string;      // JSON: [{name,is_active}]
  delivery_fee?: number;
  pickup_options?: string;   // JSON: [{time,is_active}]
  payment_methods?: string;  // JSON: [{name,type,details,qr,handling_fee,is_active}]
  member_settings?: string;  // JSON: {pointEarnPercent,pointExchangeRate,minRedeem,referralRewardType,referralRewardValue}
}

export interface OnlineProduct {
  id: number;
  store_id: string;
  product_id: number;
  name: string;
  category: string;
  price: number;
  original_price: number | null;
  stock: number;
  image_url: string;
  description: string;
  is_published: boolean;
}

export interface CartItem {
  product_id: number;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface OnlineOrder {
  id: number;
  invoice: string;
  customer_name: string;
  customer_phone: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  promo_code: string;
  handling_fee: number;
  total: number;
  payment_method: string;
  pickup_time: string;
  branch: string;
  notes: string;
  status: string;
  created_at: string;
  // v2.2.23:
  order_type?: string;
  used_points?: number;
  promo_discount?: number;
}

export interface OnlineCustomer {
  id: number;
  store_id: string;
  name: string;
  phone: string; // 08xx
  total_spent: number;
  points: number;
  level: string;
  promo_history: any[];
  created_at: string;
}

export interface Promo {
  id: number;
  store_id: string;
  code: string;
  title: string;
  type: string; // persen | nominal
  value: number;
  min_spend: number;
  quota: number | null;
  limit_per_user: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface Branch {
  id: number;
  store_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  sort: number;
}

// ─── API helpers (worker /api/online-store) ─────────────────────────

export async function getStore(storeId: string): Promise<StoreSettings | null> {
  const data = await callFn<{ store: StoreSettings }>("get_store", { store_id: storeId });
  return data?.store ?? null;
}

export async function getStoreBySlug(slug: string): Promise<StoreSettings | null> {
  // Lookup toko lama tanpa variant — action khusus di worker (slug unik
  // historis; row baru selalu punya variant → jalur utama getStoreByVariantSlug).
  const data = await callFn<{ store: StoreSettings }>("get_store_by_slug", { slug });
  return data?.store ?? null;
}

// Batch #9: lookup storefront by variant + slug — /toko/{variant}/{slug}
export async function getStoreByVariantSlug(
  variant: string,
  slug: string
): Promise<StoreSettings | null> {
  const data = await callFn<{ store: StoreSettings }>("get_store_by_variant_slug", {
    variant,
    slug,
  });
  return data?.store ?? null;
}

// Fallback: slug lama (tanpa variant) tetap bisa diakses untuk kompatibilitas
export async function getStoreByVariantSlugOrLegacy(
  variant: string,
  slug: string
): Promise<StoreSettings | null> {
  const store = await getStoreByVariantSlug(variant, slug);
  if (store) return store;
  const legacy = await getStoreBySlug(slug);
  if (legacy && !legacy.variant) return legacy;
  return null;
}

// ─── Theme colors from store (fallback per variant) ────────────────
const VARIANT_THEMES: Record<string, { primary: string; dark: string; soft: string }> = {
  "nusa-kelontong": { primary: "#F97316", dark: "#EA580C", soft: "#FFF7ED" },
  "nusa-fnb": { primary: "#E11D48", dark: "#BE123C", soft: "#FFF1F2" },
  "nusa-laundry": { primary: "#6366F1", dark: "#4F46E5", soft: "#EEF2FF" },
  "nusa-bengkel": { primary: "#2563EB", dark: "#1D4ED8", soft: "#EFF6FF" },
  "nusa-salon": { primary: "#EC4899", dark: "#DB2777", soft: "#FDF2F8" },
  "nusa-apotek": { primary: "#0891B2", dark: "#0E7490", soft: "#ECFEFF" },
  "nusa-fotocopy": { primary: "#7C3AED", dark: "#6D28D9", soft: "#F5F3FF" },
  "nusa-servis": { primary: "#059669", dark: "#047857", soft: "#ECFDF5" },
};

export function getStoreTheme(store: StoreSettings | null) {
  if (store?.primary_color && store.dark_color) {
    return {
      primary: store.primary_color,
      dark: store.dark_color,
      soft: store.soft_color || store.primary_color + "14",
    };
  }
  const fallback = VARIANT_THEMES[store?.variant || ""] ?? VARIANT_THEMES["nusa-kelontong"];
  return fallback;
}

export async function getProducts(
  storeId: string,
  category?: string
): Promise<OnlineProduct[]> {
  const data = await callFn<{ products: OnlineProduct[] }>("get_products", {
    store_id: storeId,
    ...(category ? { category } : {}),
  });
  return data?.products ?? [];
}

// ─── Store config (order types, pickup, payment methods, branches) ──
function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export interface PaymentMethod {
  name: string;
  type: string; // tunai | bank | qris | ewallet
  details?: string;
  qr?: string;
  handling_fee?: number;
  is_active?: boolean;
}

export function getPaymentMethods(store: StoreSettings): PaymentMethod[] {
  const list = parseJson<PaymentMethod[]>(store.payment_methods, []);
  if (list.length === 0) {
    // Fallback default bila pemilik belum atur: Tunai + QRIS + Transfer.
    return [
      { name: "Tunai", type: "tunai", handling_fee: 0, is_active: true },
      { name: "QRIS", type: "qris", handling_fee: 0, is_active: true },
      { name: "Transfer", type: "bank", handling_fee: 0, is_active: true },
    ];
  }
  return list.filter((m) => m.is_active !== false);
}

export function getOrderTypes(store: StoreSettings): string[] {
  const list = parseJson<{ name: string; is_active?: boolean }[]>(store.order_types, []);
  if (list.length === 0) return ["Ambil Sendiri", "Delivery"];
  return list.filter((t) => t.is_active !== false).map((t) => t.name);
}

export function getPickupOptions(store: StoreSettings): string[] {
  const list = parseJson<{ time: string; is_active?: boolean }[]>(store.pickup_options, []);
  if (list.length === 0) return ["Segera", "15 Menit", "30 Menit", "1 Jam"];
  return list.filter((t) => t.is_active !== false).map((t) => t.time);
}

export function getMemberSettings(store: StoreSettings | undefined | null) {
  return parseJson<{
    pointEarnPercent?: number;
    pointExchangeRate?: number; // Rp per poin
    minRedeem?: number;         // poin minimum untuk tukar
    referralRewardType?: string;
    referralRewardValue?: number;
    // Tier member (konfigurasi dari app — v2.2.27):
    goldMin?: number;        // poin minimal Gold (default 1000)
    platinumMin?: number;    // poin minimal Platinum (default 5000)
    goldPercent?: number;    // diskon % Gold (default 2)
    platinumPercent?: number; // diskon % Platinum (default 5)
  }>(store?.member_settings, {});
}

// ─── Tier member: level dari poin + diskon otomatis ─────────────────
export interface MemberTier {
  level: "Silver" | "Gold" | "Platinum";
  percent: number; // diskon % otomatis
}

export function memberLevelOf(
  points: number,
  settings: {
    goldMin?: number;
    platinumMin?: number;
  }
): "Silver" | "Gold" | "Platinum" {
  const goldMin = settings.goldMin ?? 1000;
  const platinumMin = settings.platinumMin ?? 5000;
  if (points >= platinumMin) return "Platinum";
  if (points >= goldMin) return "Gold";
  return "Silver";
}

export function tierDiscountPercent(
  level: string,
  settings: {
    goldPercent?: number;
    platinumPercent?: number;
  }
): number {
  if (level === "Platinum") return settings.platinumPercent ?? 5;
  if (level === "Gold") return settings.goldPercent ?? 2;
  return 0;
}

export async function getBranches(storeId: string): Promise<Branch[]> {
  const data = await callFn<{ branches: Branch[] }>("get_branches", { store_id: storeId });
  return data?.branches ?? [];
}

export async function getPromos(storeId: string): Promise<Promo[]> {
  const data = await callFn<{ promos: Promo[] }>("get_promos_public", { store_id: storeId });
  return data?.promos ?? [];
}

// ─── Customer / member ──────────────────────────────────────────────
export async function getCustomer(
  storeId: string,
  phone: string
): Promise<OnlineCustomer | null> {
  const p = normalizePhoneTo08(phone);
  if (!p) return null;
  const data = await callFn<{ customer: OnlineCustomer | null }>("get_customer", {
    store_id: storeId,
    phone: p,
  });
  return data?.customer ?? null;
}

// ─── Submit order (via worker — WA normalize + anti-dobel) ──────────
export interface SubmitOrderResult {
  invoice: string;
  whatsappUrl: string;
  status: string;
}

export interface SubmitOrderInput {
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  promoCode: string;
  handlingFee: number;
  total: number;
  paymentMethod: string;
  pickupTime: string;
  branch: string;
  notes: string;
  orderType: string;
  usedPoints: number;
  usedPromoId?: number | null;
  promoDiscount: number;
  referredBy?: string;
}

export async function submitOrder(
  storeId: string,
  order: SubmitOrderInput
): Promise<SubmitOrderResult | null> {
  const data = await callFn<SubmitOrderResult>("submit_order", {
    store_id: storeId,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    promo_code: order.promoCode,
    handling_fee: order.handlingFee,
    total: order.total,
    payment_method: order.paymentMethod,
    pickup_time: order.pickupTime,
    branch: order.branch,
    notes: order.notes,
    order_type: order.orderType,
    used_points: order.usedPoints,
    used_promo_id: order.usedPromoId ?? null,
    promo_discount: order.promoDiscount,
    referred_by: order.referredBy ?? "",
  });
  if (!data) throw new Error("Gagal submit pesanan");
  return {
    invoice: data.invoice,
    whatsappUrl: data.whatsappUrl ?? "",
    status: data.status ?? "Online Baru",
  };
}

export async function getOrders(
  storeId: string,
  phone: string
): Promise<OnlineOrder[]> {
  const p = normalizePhoneTo08(phone);
  if (!p) return [];
  const data = await callFn<{ orders: OnlineOrder[] }>("get_orders_by_phone", {
    store_id: storeId,
    phone: p,
  });
  return data?.orders ?? [];
}

export async function cancelOrder(
  storeId: string,
  orderId: number,
  phone: string
): Promise<boolean> {
  const p = normalizePhoneTo08(phone);
  if (!p) return false;
  const data = await callFn<{ ok: boolean }>("cancel_order_by_phone", {
    store_id: storeId,
    id: orderId,
    phone: p,
  });
  return data?.ok ?? false;
}

// ─── Formatting ─────────────────────────────────────────────────────
export function formatRupiah(n: number): string {
  return `Rp ${(n || 0).toLocaleString("id-ID")}`;
}

export function statusColor(status: string): string {
  switch (status) {
    case "Online Baru":
      return "text-amber-600 bg-amber-50";
    case "Menunggu Verifikasi Pembeli":
      return "text-orange-600 bg-orange-50";
    case "Disiapkan":
      return "text-green-600 bg-green-50";
    case "Siap Diambil":
      return "text-purple-600 bg-purple-50";
    case "Lunas":
      return "text-emerald-700 bg-emerald-50";
    case "Direfund":
      return "text-gray-500 bg-gray-100";
    case "Dibatalkan":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-500 bg-gray-50";
  }
}
