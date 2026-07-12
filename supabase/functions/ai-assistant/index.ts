// ============================================================================
// NUSA KASIR — AI Assistant Edge Function
// Deploy: supabase functions deploy ai-assistant --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Acts as an AI proxy for the NUSA Kasir POS app.
// Uses OpenRouter's free-tier models (Gemini Flash 2.0 Lite).
// Fetches store context (products, recent transactions, low stock) for smarter responses.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, store_name } = body as {
      messages: { role: string; content: string }[];
      store_name?: string;
    };

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch store context from Supabase
    let context = "";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Low stock products
      const { data: lowStock } = await supabase
        .from("products")
        .select("name, stock, min_stock")
        .lte("stock", supabase.sql`min_stock`)
        .limit(10);

      // Today's revenue
      const today = new Date().toISOString().split("T")[0];
      const { data: todayTx } = await supabase
        .from("transactions")
        .select("total")
        .gte("date", today)
        .limit(1000);

      if (store_name) context += `Toko: ${store_name}\n`;

      if (lowStock && lowStock.length > 0) {
        context += `Stok menipis:\n${lowStock.map((p: any) => `  - ${p.name}: ${p.stock}`).join("\n")}\n`;
      }

      if (todayTx && todayTx.length > 0) {
        const omzet = todayTx.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
        context += `Omzet hari ini: Rp ${omzet.toLocaleString("id-ID")} (${todayTx.length} transaksi)\n`;
      }
    } catch (_) {
      // Context is optional — continue without it
    }

    // System prompt
    const systemPrompt = `Kamu adalah AI Assistant untuk NUSA Kasir, aplikasi Point of Sale untuk warung/toko kelontong di Indonesia.

Kamu BISA membantu dengan:
- Menjawab pertanyaan tentang fitur NUSA Kasir (produk, transaksi, stok, pelanggan, laporan, dll)
- Memberikan saran bisnis (strategi harga, manajemen stok, promosi)
- Menjelaskan cara menggunakan fitur tertentu
- Menghitung margin, laba, atau analisis sederhana

Kamu TIDAK BISA:
- Mengedit data langsung — minta user melakukannya sendiri di aplikasi
- Melihat detail transaksi spesifik — hanya ringkasan

Gunakan bahasa Indonesia yang ramah dan santai. Jawab singkat dan langsung.${context ? "\n\nKONTEKS TOKO:\n" + context : ""}`;

    // Call OpenRouter
    if (!OPENROUTER_KEY) {
      // Fallback: simple rule-based responses when no API key
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
      let reply = "Maaf, AI Assistant belum dikonfigurasi (butuh OPENROUTER_API_KEY).\n\nTapi saya bisa bantu dasar:\n- Untuk tambah produk: buka menu Produk → + Tambah\n- Untuk laporan: buka menu Laporan\n- Untuk stok menipis: cek menu Stok";
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://nusa-online.vercel.app",
        "X-Title": "NUSA Kasir",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20), // last 20 messages max
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenRouter error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Maaf, tidak bisa menjawab saat ini.";

    return new Response(JSON.stringify({ reply }), {
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
