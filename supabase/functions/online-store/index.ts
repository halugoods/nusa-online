// ============================================================================
// NUSA KASIR — Online Store Edge Function
// Deploy: supabase functions deploy online-store --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Handles all admin operations for the online store:
//   action: 'upsert_store'   — create/update store settings (slug unik per variant)
//   action: 'check_slug'     — cek ketersediaan slug (untuk input real-time)
//   action: 'sync_products'  — batch upsert products for a store
//   action: 'get_orders'     — get online orders for a store
//   action: 'update_order'   — update order status (state machine)
//   action: 'get_store'      — get store settings
//   action: 'get_store_by_variant_slug' — public storefront lookup
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "upsert_store":
        return upsertStore(supabase, params);
      case "check_slug":
        return checkSlug(supabase, params);
      case "sync_products":
        return syncProducts(supabase, params);
      case "get_orders":
        return getOrders(supabase, params);
      case "update_order":
        return updateOrder(supabase, params);
      case "get_store":
        return getStore(supabase, params);
      case "get_store_by_variant_slug":
        return getStoreByVariantSlug(supabase, params);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
});

// ─── Slug helpers ────────────────────────────────────────────────────
// Slug hanya huruf kecil, angka, dan tanda hubung. Panjang maks 40.
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 40;
}

// ─── Upsert store settings ──────────────────────────────────────────
async function upsertStore(supabase: any, params: any) {
  const {
    store_id, store_name, description, whatsapp, address, open_hours,
    is_active, slug, variant, theme_id, primary_color, dark_color, soft_color,
  } = params;
  if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

  // Validasi slug jika dikirim (wajib valid + unik per variant)
  if (slug !== undefined && slug !== null && slug !== "") {
    if (!isValidSlug(slug)) {
      return jsonResponse({ error: "slug_invalid" }, 400);
    }
    // Cek slug dipakai toko LAIN (variant sama, store_id beda)
    const { data: existing, error: checkErr } = await supabase
      .from("store_settings")
      .select("store_id")
      .eq("variant", variant ?? "")
      .eq("slug", slug)
      .neq("store_id", store_id)
      .maybeSingle();
    if (checkErr) return jsonResponse({ error: checkErr.message }, 500);
    if (existing) {
      return jsonResponse({ error: "slug_taken" }, 409);
    }
  }

  const { error } = await supabase.from("store_settings").upsert({
    store_id,
    store_name: store_name ?? "",
    description: description ?? "",
    whatsapp: whatsapp ?? "",
    address: address ?? "",
    open_hours: open_hours ?? "08:00 - 21:00",
    is_active: is_active ?? false,
    slug: slug ?? "",
    variant: variant ?? "",
    theme_id: theme_id ?? "",
    primary_color: primary_color ?? "",
    dark_color: dark_color ?? "",
    soft_color: soft_color ?? "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "store_id" });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true });
}

// ─── Cek ketersediaan slug (real-time saat user mengetik) ───────────
async function checkSlug(supabase: any, params: any) {
  const { slug, variant } = params;
  if (!slug) return jsonResponse({ error: "slug required" }, 400);
  if (!isValidSlug(slug)) {
    return jsonResponse({ available: false, reason: "invalid" });
  }

  const { data, error } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("variant", variant ?? "")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ available: !data, reason: data ? "taken" : "ok" });
}

// ─── Sync products (batch upsert) ──────────────────────────────────
async function syncProducts(supabase: any, params: any) {
  const { store_id, products } = params;
  if (!store_id) return jsonResponse({ error: "store_id required" }, 400);
  if (!products || !Array.isArray(products)) return jsonResponse({ error: "products array required" }, 400);

  const now = new Date().toISOString();
  const rows = products.map((p: any) => ({
    store_id,
    product_id: p.product_id,
    name: p.name,
    category: p.category ?? "Lainnya",
    price: p.price,
    stock: p.stock ?? 0,
    image_url: p.image ?? "",
    description: p.description ?? "",
    is_published: p.is_published ?? true,
    updated_at: now,
  }));

  // Delete old products, then insert new batch (clean sync)
  const { error: delErr } = await supabase
    .from("online_products")
    .delete()
    .eq("store_id", store_id);

  if (delErr) return jsonResponse({ error: delErr.message }, 500);

  const { error: insErr } = await supabase
    .from("online_products")
    .upsert(rows, { onConflict: "store_id, product_id" });

  if (insErr) return jsonResponse({ error: insErr.message }, 500);

  return jsonResponse({ ok: true, count: rows.length });
}

// ─── Get orders for a store ────────────────────────────────────────
async function getOrders(supabase: any, params: any) {
  const { store_id, status, limit } = params;
  if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

  let query = supabase
    .from("online_orders")
    .select("*")
    .eq("store_id", store_id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  query = query.limit(limit ?? 50);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ orders: data ?? [] });
}

// ─── Update order status (state machine) ───────────────────────────
async function updateOrder(supabase: any, params: any) {
  const { store_id, order_id, status, processed_by } = params;
  if (!store_id || !order_id || !status) {
    return jsonResponse({ error: "store_id, order_id, status required" }, 400);
  }

  // Validate state transition
  const validTransitions: Record<string, string[]> = {
    "Online Baru": ["Disiapkan", "Dibatalkan"],
    "Disiapkan": ["Siap Diambil", "Dibatalkan"],
    "Siap Diambil": ["Lunas", "Dibatalkan"],
    "Lunas": [],
    "Dibatalkan": [],
  };

  // Get current status
  const { data: existing } = await supabase
    .from("online_orders")
    .select("status")
    .eq("id", order_id)
    .eq("store_id", store_id)
    .single();

  if (!existing) return jsonResponse({ error: "Order not found" }, 404);

  const currentStatus = existing.status;
  const allowed = validTransitions[currentStatus];
  if (!allowed || !allowed.includes(status)) {
    return jsonResponse({
      error: `Cannot transition from '${currentStatus}' to '${status}'`,
      allowed,
    }, 400);
  }

  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (processed_by) {
    updates.processed_by = processed_by;
  }

  const { error } = await supabase
    .from("online_orders")
    .update(updates)
    .eq("id", order_id)
    .eq("store_id", store_id);

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ ok: true, status });
}

// ─── Get store settings ────────────────────────────────────────────
async function getStore(supabase: any, params: any) {
  const { store_id } = params;
  if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store_id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: "Store not found or inactive" }, 404);

  return jsonResponse({ store: data });
}

// ─── Public storefront lookup: /toko/{variant}/{slug} ──────────────
async function getStoreByVariantSlug(supabase: any, params: any) {
  const { variant, slug } = params;
  if (!variant || !slug) {
    return jsonResponse({ error: "variant and slug required" }, 400);
  }

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("variant", variant)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: "Store not found or inactive" }, 404);

  return jsonResponse({ store: data });
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
