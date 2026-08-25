// ============================================================================
// NUSA — Tutorial Manager Edge Function
// Deploy: supabase functions deploy tutorial-manager --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Admin CRUD untuk tabel `tutorials` (video panduan app, per varian).
//   action: 'list'    → semua tutorial (opsional filter variants)
//   action: 'create'  → tambah tutorial { title, yt_url, thumbnail_url, description, variants[], sort_order }
//   action: 'update'  → ubah tutorial { id, ... }
//   action: 'delete'  → hapus tutorial { id }
// Dilindungi header `x-admin-key` (kecocokan dgn env NUSA_ADMIN_KEY).
// ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NUSA_ADMIN_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

const bodyOf = (b: Record<string, unknown>, key: string) =>
  b[key] as string | undefined;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const adminKey = req.headers.get("x-admin-key") ?? "";
  if (adminKey !== ADMIN_KEY) return json({ error: "Unauthorized" }, 401);

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Server config error" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json();
    const action = body.action as string;
    const query = supabase.from("tutorials");

    switch (action) {
      case "list": {
        const { data, error } = await query
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ tutorials: data });
      }

      case "create": {
        const title = bodyOf(body, "title");
        const ytUrl = bodyOf(body, "yt_url");
        if (!title || !ytUrl) return json({ error: "title & yt_url required" }, 400);
        const { data, error } = await query
          .insert({
            title,
            yt_url: ytUrl,
            thumbnail_url: bodyOf(body, "thumbnail_url") ?? null,
            description: bodyOf(body, "description") ?? null,
            variants: Array.isArray(body.variants) ? body.variants : [],
            sort_order: Number(body.sort_order ?? 0) || 0,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ tutorial: data });
      }

      case "update": {
        const id = bodyOf(body, "id");
        if (!id) return json({ error: "id required" }, 400);
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) patch.title = body.title as string;
        if (body.yt_url !== undefined) patch.yt_url = body.yt_url as string;
        if (body.thumbnail_url !== undefined) patch.thumbnail_url = body.thumbnail_url as string | null;
        if (body.description !== undefined) patch.description = body.description as string | null;
        if (body.variants !== undefined) patch.variants = body.variants as string[];
        if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
        const { data, error } = await query.update(patch).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ tutorial: data });
      }

      case "delete": {
        const id = bodyOf(body, "id");
        if (!id) return json({ error: "id required" }, 400);
        const { error } = await query.delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      default:
        return json({ error: 'action must be "list"|"create"|"update"|"delete"' }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", message: String(e) }, 500);
  }
});