import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function requireSupabase() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase not configured");
  return client;
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
}

export interface OnlineProduct {
  id: number;
  store_id: string;
  product_id: number;
  name: string;
  category: string;
  price: number;
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
}

// ─── API helpers ────────────────────────────────────────────────────

export async function getStore(storeId: string): Promise<StoreSettings | null> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .single();
  return data as StoreSettings | null;
}

export async function getStoreBySlug(slug: string): Promise<StoreSettings | null> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data as StoreSettings | null;
}

export async function getProducts(
  storeId: string,
  category?: string
): Promise<OnlineProduct[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from("online_products")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_published", true)
    .order("name");

  if (category && category !== "Semua") {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return (data as OnlineProduct[]) ?? [];
}

export interface SubmitOrderResult {
  invoice: string;
  whatsappUrl: string;
}

export async function submitOrder(
  storeId: string,
  order: {
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
  }
): Promise<SubmitOrderResult | null> {
  const supabase = requireSupabase();
  const invoice = `ONL-${new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(2, 14)}`;

  // 1. Insert order
  const { error } = await supabase.from("online_orders").insert({
    store_id: storeId,
    invoice,
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
    status: "Online Baru",
  });

  if (error) throw new Error(error.message);

  // 2. Auto-register customer (upsert by phone)
  if (order.customerName && order.customerPhone) {
    try {
      // Check if customer already exists by phone
      const { data: existing } = await supabase
        .from("customers")
        .select("id, total_spent, points")
        .eq("store_id", storeId)
        .eq("phone", order.customerPhone)
        .single();

      const newTotal = (existing?.total_spent ?? 0) + order.total;
      const newPoints = Math.floor(newTotal / 10000); // 1 poin per Rp 10.000
      let level = "Silver";
      if (newPoints >= 5000) level = "Platinum";
      else if (newPoints >= 1000) level = "Gold";

      if (existing) {
        await supabase
          .from("customers")
          .update({
            name: order.customerName,
            total_spent: newTotal,
            points: newPoints,
            level,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          store_id: storeId,
          name: order.customerName,
          phone: order.customerPhone,
          total_spent: order.total,
          points: Math.floor(order.total / 10000),
          level: "Silver",
        });
      }
    } catch (e) {
      // Customer registration is non-blocking — order already saved
      console.warn("[submitOrder] customer auto-register failed:", e);
    }
  }

  // 3. Build WhatsApp notification URL
  const { data: store } = await supabase
    .from("store_settings")
    .select("store_name, whatsapp")
    .eq("store_id", storeId)
    .single();

  const storeWhatsapp = store?.whatsapp || order.customerPhone;
  const storeName = store?.store_name || "Toko";

  const itemsText = order.items
    .map((i) => `• ${i.name} x${i.qty} — ${formatRupiah(i.subtotal)}`)
    .join("\n");

  const waMessage = encodeURIComponent(
    `🛒 *Pesanan Baru — ${storeName}*\n\n` +
    `📋 *${invoice}*\n` +
    `👤 ${order.customerName}\n` +
    `📱 ${order.customerPhone}\n` +
    `🏪 ${order.branch}\n` +
    `💳 ${order.paymentMethod}\n` +
    `🕐 ${order.pickupTime}\n\n` +
    `*Item:*\n${itemsText}\n\n` +
    `💰 *Total: ${formatRupiah(order.total)}*\n\n` +
    `_Catatan: ${order.notes || "-"}_`
  );

  return {
    invoice,
    whatsappUrl: `https://wa.me/${storeWhatsapp.replace(/\D/g, "")}?text=${waMessage}`,
  };
}

export async function getOrders(
  storeId: string,
  phone: string
): Promise<OnlineOrder[]> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("online_orders")
    .select("*")
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data as OnlineOrder[]) ?? [];
}

export async function cancelOrder(
  storeId: string,
  orderId: number,
  phone: string
): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("online_orders")
    .update({ status: "Dibatalkan" })
    .eq("id", orderId)
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
    .eq("status", "Online Baru");

  return !error;
}

// ─── Formatting ─────────────────────────────────────────────────────
export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function statusColor(status: string): string {
  switch (status) {
    case "Online Baru":
      return "text-amber-600 bg-amber-50";
    case "Disiapkan":
      return "text-green-600 bg-green-50";
    case "Siap Diambil":
      return "text-purple-600 bg-purple-50";
    case "Lunas":
      return "text-emerald-700 bg-emerald-50";
    case "Dibatalkan":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-500 bg-gray-50";
  }
}
