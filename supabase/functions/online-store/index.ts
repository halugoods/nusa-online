// ============================================================================
// NUSA KASIR — Online Store Edge Function
// Deploy: supabase functions deploy online-store --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Handles all admin operations for the online store:
//   action: 'upsert_store'  — create/update store settings
//   action: 'sync_products' — batch upsert products for a store
//   action: 'get_orders'    — get online orders for a store
//   action: 'update_order'  — update order status (state machine)
//   action: 'get_store'     — get store settings
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
      case "sync_products":
        return syncProducts(supabase, params);
      case "get_orders":
        return getOrders(supabase, params);
      case "update_order":
        return updateOrder(supabase, params);
      case "get_store":
        return getStore(supabase, params);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
});

// ─── Upsert store settings ──────────────────────────────────────────
async function upsertStore(supabase: any, params: any) {
  const { store_id, store_name, description, whatsapp, address, open_hours, is_active } = params;
  if (!store_id) return jsonResponse({ error: "store_id required" }, 400);

  const { error } = await supabase.from("store_settings").upsert({
    store_id,
    store_name: store_name ?? "",
    description: description ?? "",
    whatsapp: whatsapp ?? "",
    address: address ?? "",
    open_hours: open_hours ?? "08:00 - 21:00",
    is_active: is_active ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "store_id" });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true });
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

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
