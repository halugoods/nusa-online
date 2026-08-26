// ============================================================================
// NUSA — App Ping (v2.2.57)
// Deploy: supabase functions deploy app_ping --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Dipanggil oleh aplikasi NUSA (Flutter) saat start. Dua fungsi sekaligus:
//   1. Catat versi app perangkat ke licenses.last_app_version/_build/last_seen_at
//      (dashboard admin bisa lihat user masih di versi berapa + stale badge).
//   2. Kembalikan versi minimum produk (app_min_versions) → kalau build app
//      < min_build, app menampilkan popup UPDATE WAJIB (blocking).
//
// PUBLIC (tanpa x-admin-key) — app hanya bisa menyentuh baris license yang
// key-nya dia kirim sendiri; tidak ada data lain yang terekspos.
//
// Body: { key, product, version, build }
// Res:  { ok, update_required, min_version, min_build, download_url }
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { key, product, version, build } = await req.json();
    if (!key || !product) {
      return json({ ok: false, error: "key and product required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const normKey = String(key).trim().toUpperCase();
    const buildNum = Number(build) || 0;

    // 1) Catat versi perangkat (abaikan kalau key tidak ditemukan —
    //    device belum aktivasi tetap boleh cek versi minimum).
    await supabase
      .from("licenses")
      .update({
        last_app_version: String(version ?? ""),
        last_app_build: buildNum,
        last_seen_at: new Date().toISOString(),
      })
      .eq("key", normKey);

    // 2) Versi minimum produk.
    const { data: minRow } = await supabase
      .from("app_min_versions")
      .select("min_version, min_build, download_url")
      .eq("product", product)
      .maybeSingle();

    const minBuild = minRow?.min_build ?? 0;
    const updateRequired = minBuild > 0 && buildNum > 0 && buildNum < minBuild;

    return json({
      ok: true,
      update_required: updateRequired,
      min_version: minRow?.min_version ?? "",
      min_build: minBuild,
      download_url: minRow?.download_url ?? null,
    });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
});
