// ============================================================================
// NUSA KASIR — AI Assistant Edge Function (Area H — cloud AI upgrade)
// Deploy: supabase functions deploy ai-assistant --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// v2: Pindah penuh ke cloud. Provider AI DICONFIGURABLE per pengguna lewat
// tabel `ai_settings` (base_url / api_key / model) — default ke OpenRouter
// gratis (Gemini Flash Lite). Tool-calling dari app (JSON Schema) + response
// STREAMING via SSE (text/event-stream) sehingga app bisa render token
// bertahap.
//
// Auth: `x-admin-key` (NUSA_ADMIN_KEY) untuk dashboard admin, ATAU
// `Authorization: Bearer <supabase anon JWT>` dari app (fungsi public).
// Owner identity dikirim app di body (`owner`) — canonical UID.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, x-admin-key, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const DEFAULT_AI_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_AI_MODEL = "google/gemini-2.0-flash-lite-001";
const DEFAULT_AI_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth: admin key ATAU JWT anon Supabase ──
  const adminHeader = req.headers.get("x-admin-key") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const isAdmin = adminHeader === ADMIN_KEY;
  const hasAnon = authHeader.startsWith("Bearer ") && authHeader.length > 30;
  if (!isAdmin && !hasAnon) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Router: GET /settings (ambil config AI) ──
  if (req.method === "GET") {
    return handleGetSettings(req);
  }

  try {
    const body = await req.json();

    // ── Action routing (admin): save_settings / test ──
    // Dipakai dashboard nusa-online (tab AI) & app (AiService.saveSettings).
    if (body.action === "save_settings") {
      return await handleSaveSettings(body, isAdmin);
    }
    if (body.action === "test") {
      return await handleTest(body, isAdmin);
    }

    const {
      messages,
      store_name,
      tools,
      owner,
      session_id,
    } = body as {
      messages: { role: string; content: string | null }[];
      store_name?: string;
      tools?: unknown[];
      owner?: string;
      session_id?: string;
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Load provider config dari ai_settings (fallback default) ──
    let aiBase = DEFAULT_AI_BASE;
    let aiKey = DEFAULT_AI_KEY;
    let aiModel = DEFAULT_AI_MODEL;
    let isCustom = false;
    if (owner && owner.length > 0) {
      try {
        const { data: cfg } = await supabase
          .from("ai_settings")
          .select("base_url, api_key, model, is_custom")
          .eq("owner", owner)
          .maybeSingle();
        if (cfg) {
          if (cfg.base_url) aiBase = cfg.base_url;
          if (cfg.api_key) aiKey = cfg.api_key;
          if (cfg.model) aiModel = cfg.model;
          isCustom = cfg.is_custom ?? false;
        }
      } catch (_) {
        // config optional — pakai default
      }
    }

    // ── Persist chat history ke cloud ──
    if (owner && owner.length > 0 && session_id && session_id.length > 0) {
      try {
        const rows = messages
          .filter((m) => m && m.role && (m.content || m.role !== "user"))
          .map((m) => ({
            owner,
            session_id,
            role: m.role,
            content: typeof m.content === "string" ? m.content : "",
          }));
        if (rows.length > 0) {
          await supabase.from("ai_chat_history").insert(rows);
        }
      } catch (_) {
        // history optional — jangan gagalkan chat karena ini
      }
    }

    // ── System prompt + konteks toko ──
    const systemPrompt = buildSystemPrompt(store_name);

    // ── Call provider (streaming SSE jika minta) ──
    if (!aiKey) {
      return new Response(JSON.stringify({ reply: fallbackReply() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = body.stream === true;
    const providerBody = {
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20),
      ],
      max_tokens: 800,
      temperature: 0.7,
      ...(tools && tools.length > 0 ? { tools: tools as unknown[] } : {}),
      ...(stream ? { stream: true } : {}),
    };

    const providerRes = await fetch(`${aiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiKey}`,
        ...(aiBase.includes("openrouter")
          ? { "HTTP-Referer": "https://nusa-online.vercel.app", "X-Title": "NUSA Kasir" }
          : {}),
      },
      body: JSON.stringify(providerBody),
    });

    if (!providerRes.ok) {
      const err = await providerRes.text();
      console.error("AI provider error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming: relay SSE chunks `data: {...}` — parse delta dari provider
    // (OpenAI-compatible format) dan terjemahkan ke delta teks/tool untuk app.
    if (stream) {
      return streamResponse(providerRes, corsHeaders);
    }

    // Non-streaming: parse JSON biasa
    const data = await providerRes.json();
    const choice = data.choices?.[0]?.message;
    const reply =
      choice?.content ?? choice?.reasoning_content ?? "Maaf, tidak bisa menjawab saat ini.";
    const rawToolCalls = choice?.tool_calls ?? null;

    return new Response(JSON.stringify({ reply, tool_calls: rawToolCalls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-assistant error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── GET /settings — ambil config AI untuk owner (dipakai dashboard nusa-online
//    & app untuk menampilkan status provider) ──
async function handleGetSettings(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  let cfg: Record<string, unknown> | null = null;
  if (owner) {
    try {
      const { data } = await supabase
        .from("ai_settings")
        .select("base_url, model, is_custom, updated_at")
        .eq("owner", owner)
        .maybeSingle();
      if (data) cfg = data as Record<string, unknown>;
    } catch (_) {}
  }
  return new Response(
    JSON.stringify({
      base_url: cfg?.base_url ?? DEFAULT_AI_BASE,
      model: cfg?.model ?? DEFAULT_AI_MODEL,
      is_custom: cfg?.is_custom ?? false,
      default_model: DEFAULT_AI_MODEL,
      owner: owner || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── POST save_settings — upsert ai_settings (dashboard admin + app) ──
async function handleSaveSettings(
  body: Record<string, unknown>,
  isAdmin: boolean
): Promise<Response> {
  const owner = String(body.owner ?? "").trim();
  const baseUrl = String(body.base_url ?? "").trim();
  const apiKey = String(body.api_key ?? "").trim();
  const model = String(body.model ?? "").trim();

  if (!owner) {
    return json({ error: "owner is required" }, 400);
  }
  // App memakai anon JWT; dashboard admin memakai x-admin-key. Keduanya
  // boleh menyimpan setting owner-nya sendiri.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const payload: Record<string, unknown> = {
    owner,
    updated_at: new Date().toISOString(),
  };
  if (baseUrl) payload.base_url = baseUrl;
  if (apiKey) payload.api_key = apiKey;
  if (model) payload.model = model;
  // Simpan flag: pakai custom config atau default key bawaan.
  payload.is_custom = !!(apiKey && baseUrl);

  try {
    await supabase.from("ai_settings").upsert(payload, { onConflict: "owner" });
  } catch (err) {
    console.error("save_settings error:", err);
    return json({ error: "Gagal menyimpan konfigurasi AI" }, 500);
  }
  return json({ ok: true, message: "Konfigurasi AI disimpan" });
}

// ── POST test — uji koneksi provider (config draft, belum disimpan) ──
async function handleTest(
  body: Record<string, unknown>,
  isAdmin: boolean
): Promise<Response> {
  const baseUrl = String(body.base_url ?? "").trim() || DEFAULT_AI_BASE;
  const apiKey = String(body.api_key ?? "").trim() || DEFAULT_AI_KEY;
  const model = String(body.model ?? "").trim() || DEFAULT_AI_MODEL;

  if (!apiKey) {
    return json({
      ok: false,
      message: "API key kosong — isi API key atau biarkan kosong untuk memakai key bawaan.",
    });
  }

  const started = Date.now();
  try {
    const providerRes = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...(baseUrl.includes("openrouter")
          ? { "HTTP-Referer": "https://nusa-online.vercel.app", "X-Title": "NUSA Kasir" }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Balas singkat: OK" }],
        max_tokens: 10,
      }),
    });
    const latencyMs = Date.now() - started;
    if (!providerRes.ok) {
      const errText = (await providerRes.text()).slice(0, 200);
      return json({
        ok: false,
        message: `Provider ${providerRes.status}: ${errText}`,
        latency_ms: latencyMs,
      });
    }
    const data = await providerRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return json({
      ok: true,
      model,
      message: "Koneksi berhasil",
      latency_ms: latencyMs,
      reply: typeof reply === "string" ? reply.slice(0, 120) : String(reply),
    });
  } catch (err) {
    return json({
      ok: false,
      message: `Gagal terhubung: ${(err as Error).message}`,
      latency_ms: Date.now() - started,
    });
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Relay SSE dari provider ke client ──
function streamResponse(providerRes: Response, corsHeaders: Record<string, string>): Response {
  const reader = providerRes.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({ reply: "Maaf, tidak bisa menjawab saat ini." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE events dipisah newline; kumpulkan sampai satu baris lengkap
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta;
              if (!delta) continue;
              const text = delta.content ?? delta.reasoning_content ?? "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`)
                );
              }
              // Tool call delta (jarang di stream, tapi didukung)
              if (delta.tool_calls) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ tool_calls_delta: delta.tool_calls })}\n\n`
                  )
                );
              }
            } catch (_) {
              // bukan JSON — lewati
            }
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        console.error("SSE relay error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildSystemPrompt(store_name?: string): string {
  const context = store_name ? `\n\nKONTEKS TOKO:\nToko: ${store_name}` : "";
  return `Kamu adalah AI Assistant untuk NUSA Kasir, aplikasi Point of Sale untuk warung/toko kelontong di Indonesia.

Kamu BISA membantu dengan:
- Menjawab pertanyaan tentang fitur NUSA Kasir (produk, transaksi, stok, pelanggan, laporan, dll)
- Memberikan saran bisnis (strategi harga, manajemen stok, promosi)
- Menjelaskan cara menggunakan fitur tertentu
- Menghitung margin, laba, atau analisis sederhana

Kamu TIDAK BISA:
- Mengedit data langsung — minta user melakukannya sendiri di aplikasi
- Melihat detail transaksi spesifik — hanya ringkasan

Gunakan bahasa Indonesia yang ramah dan santai. Jawab singkat dan langsung.${context}

Jika kamu perlu data detail dari toko (produk, stok, transaksi, pelanggan, dll), gunakan TOOL yang tersedia (get_products, get_low_stock, get_transactions, get_summary, get_customers, get_top_products, get_promos, get_employees, get_attendance, get_expenses, get_debts, get_suppliers). JANGAN mengarang angka — panggil tool dulu.`;
}

function fallbackReply(): string {
  return "Maaf, AI Assistant belum dikonfigurasi (butuh API key).\n\nTapi saya bisa bantu dasar:\n- Untuk tambah produk: buka menu Produk → + Tambah\n- Untuk laporan: buka menu Laporan\n- Untuk stok menipis: cek menu Stok";
}
