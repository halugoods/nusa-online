// ============================================================================
// NUSA KASIR — Arsip bulanan OTOMATIS (cold storage rotasi)
// ============================================================================
// Dipanggil pg_cron (atau manual oleh admin) — TANPA body:
//   * Hitung bulan pembukuan yang baru selesai (bulan sebelumnya, WIB).
//   * Loop semua user di sheets_registry yang punya spreadsheet.
//   * Arsip SEMUA tab spreadsheet user ke sheets_archive (idempotent —
//     unique(user_id, bulan, tab)), lalu kosongkan tab di spreadsheet.
//
// Logika arsip DI-IMPORT dari sheets-admin (satu sumber, tidak dobel).
//
// SETUP (sekali, via SQL Editor — token CLI di OS keyring):
//
//   select cron.schedule(
//     'nusa-sheets-archive', '0 18 1 * *',
//     $$ select net.http_post(
//          url := 'https://sakeuhcbcnueplzlkltm.supabase.co/functions/v1/sheets-archive-cron',
//          headers := jsonb_build_object('x-admin-key', '280303', 'Content-Type', 'application/json'),
//          body := '{}'::jsonb
//        ) $$
//   );
//
//   (jadwal: tanggal 1 18:00 UTC = tanggal 2, 01:00 WIB — di luar jam sibuk)
// ============================================================================

import {
  serviceClient,
  isAdmin,
  archiveUserMonth,
} from "../sheets-admin/shared.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);
    const supabase = serviceClient();

    // Bulan pembukuan yang baru selesai = bulan lalu, zona WIB (UTC+7).
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const bulan =
      `${prev.getFullYear()}-` + String(prev.getMonth() + 1).padStart(2, "0");

    const { data: regs, error } = await supabase
      .from("sheets_registry")
      .select("user_id, spreadsheet_id")
      .not("spreadsheet_id", "is", null)
      .neq("spreadsheet_id", "")
      .limit(500);
    if (error) throw new Error(`Gagal baca registry: ${error.message}`);

    const results: Record<string, any> = {};
    let ok = 0;
    let fail = 0;
    for (const r of regs ?? []) {
      try {
        const res = await archiveUserMonth(supabase, r.user_id, bulan);
        results[r.user_id] = res;
        ok++;
      } catch (e: any) {
        results[r.user_id] = { error: e?.message ?? String(e) };
        fail++;
      }
    }

    return json({
      ok: fail === 0,
      bulan,
      total_users: (regs ?? []).length,
      success: ok,
      failed: fail,
      results,
    });
  } catch (e: any) {
    console.error(`[sheets-archive-cron] ${e?.stack ?? e}`);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
