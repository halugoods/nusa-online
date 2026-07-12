// ============================================================================
// NUSA KASIR — License Manager Edge Function
// Deploy: supabase functions deploy license-manager --project-ref sakeuhcbcnueplzlkltm
// ============================================================================
// Admin operations for activation key management:
//   action: 'generate'   — generate new signed activation key(s)
//   action: 'add'        — add a pre-generated key (from keygen.dart CLI)
//   action: 'list'       — list all licenses with activation counts
//   action: 'detail'     — get single license with its activations
//   action: 'revoke'     — revoke a license key
//   action: 'delete'     — delete an unused license
//   action: 'stats'      — summary stats
//
// Env vars required for keygen:
//   NUSA_PRIVATE_KEY — 64-char hex Ed25519 private key
//   NUSA_PUBLIC_KEY  — 64-char hex Ed25519 public key
//   NUSA_ADMIN_KEY   — admin password (default: nusa-admin-2024)
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as ed from "https://esm.sh/@noble/ed25519@2";
import { sha512 } from "https://esm.sh/@noble/hashes@1/sha512";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// Polyfill sync sha512 for noble-ed25519 (Deno needs explicit hash setup)
ed.etc.sha512Sync = (...msgs: Uint8Array[]): Uint8Array => {
  const h = sha512.create();
  for (const m of msgs) h.update(m);
  return h.digest();
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";
const PRIVATE_KEY_HEX = Deno.env.get("NUSA_PRIVATE_KEY") ?? "";
const PUBLIC_KEY_HEX = Deno.env.get("NUSA_PUBLIC_KEY") ?? "";

// ─── Keygen (matches tools/keygen/bin/keygen.dart exactly) ────────────

const PREFIX = "NUSA-";
const SERIAL_LEN = 8;
const SERIAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateSerial(): string {
  const bytes = new Uint8Array(SERIAL_LEN);
  crypto.getRandomValues(bytes);
  let buf = "";
  for (let i = 0; i < SERIAL_LEN; i++) {
    buf += SERIAL_ALPHABET[bytes[i] % SERIAL_ALPHABET.length];
  }
  return buf;
}

function base32Encode(data: Uint8Array): string {
  let bits = 0, value = 0;
  const out: string[] = [];
  for (const b of data) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push(B32_ALPHABET[(value >> bits) & 31]);
    }
  }
  if (bits > 0) {
    out.push(B32_ALPHABET[(value << (5 - bits)) & 31]);
  }
  return out.join("");
}

function formatKey(serial: string, signature: Uint8Array): string {
  const sigB32 = base32Encode(signature);
  const groups: string[] = [];
  for (let i = 0; i < serial.length; i += 4) {
    groups.push(serial.substring(i, i + 4));
  }
  for (let i = 0; i < sigB32.length; i += 4) {
    groups.push(sigB32.substring(i, i + 4));
  }
  return PREFIX + groups.join("-");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function generateKey(): Promise<{ key: string; serial: string }> {
  if (!PRIVATE_KEY_HEX) {
    throw new Error("NUSA_PRIVATE_KEY not set in environment");
  }

  const serial = generateSerial();
  const privKeyBytes = hexToBytes(PRIVATE_KEY_HEX);
  const sig = await ed.sign(new TextEncoder().encode(serial), privKeyBytes);
  const key = formatKey(serial, sig);
  return { key, serial };
}

// ─── Main ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin auth check
    const adminKey = req.headers.get("x-admin-key") ?? "";
    if (adminKey !== ADMIN_KEY) {
      return json({ error: "Unauthorized — invalid admin key" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "generate":
        return handleGenerate(supabase, params);
      case "add":
        return handleAdd(supabase, params);
      case "list":
        return handleList(supabase, params);
      case "detail":
        return handleDetail(supabase, params);
      case "revoke":
        return handleRevoke(supabase, params);
      case "delete":
        return handleDelete(supabase, params);
      case "stats":
        return handleStats(supabase);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

// ─── Generate new signed activation key(s) ───────────────────────────

async function handleGenerate(supabase: any, params: any) {
  const count = Math.max(1, Math.min(params.count ?? 1, 100));
  const ownerEmail = params.owner_email ?? null;
  const product = params.product ?? "nusa-kasir";

  const keys: { key: string; serial: string }[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const k = await generateKey();
      keys.push(k);
    } catch (e) {
      return json({ error: e.message, generated: keys.length }, 500);
    }
  }

  // Insert all into licenses table
  const { error } = await supabase.from("licenses").insert(
    keys.map((k) => ({
      key: k.key,
      serial: k.serial,
      product,
      status: "issued",
      owner_email: ownerEmail,
    }))
  );

  if (error) {
    return json({ error: error.message, generated: 0 }, 500);
  }

  return json({
    ok: true,
    count: keys.length,
    keys: keys.map((k) => k.key),
  });
}

// ─── Add a pre-generated key (from keygen.dart CLI) ──────────────────

async function handleAdd(supabase: any, params: any) {
  const { key, serial, owner_email, product } = params;
  if (!key || !serial) {
    return json({ error: "key and serial required" }, 400);
  }

  const { error } = await supabase.from("licenses").insert({
    key: String(key).toUpperCase(),
    serial: String(serial),
    product: product ?? "nusa-kasir",
    status: "issued",
    owner_email: owner_email ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return json({ error: "Key already exists" }, 409);
    }
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, key: String(key).toUpperCase() });
}

// ─── List all licenses with activation counts ────────────────────────

async function handleList(supabase: any, params: any) {
  const page = Math.max(0, params.page ?? 0);
  const limit = Math.min(params.limit ?? 50, 200);
  const status = params.status ?? null;
  const search = params.search ?? null;
  const from = page * limit;
  const to = from + limit - 1;

  // Query activations count per license — we'll do a single join
  // Since we can't join directly, we query licenses and activations separately
  let licenseQuery = supabase
    .from("licenses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) licenseQuery = licenseQuery.eq("status", status);
  if (search) licenseQuery = licenseQuery.or(`key.ilike.%${search}%,owner_email.ilike.%${search}%`);

  // Apply pagination via range — but we also need total count from a separate query
  // Supabase's .range modifies the query, so we do count first
  const { count, error: countErr } = await licenseQuery;
  if (countErr) return json({ error: countErr.message }, 500);

  const { data, error } = await licenseQuery.range(from, to);
  if (error) return json({ error: error.message }, 500);

  // Get activation counts for returned licenses
  const licenseIds = (data ?? []).map((l: any) => l.id);
  let activationCounts: Record<string, number> = {};

  if (licenseIds.length > 0) {
    const { data: actData } = await supabase
      .from("activations")
      .select("license_id")
      .in("license_id", licenseIds);

    for (const a of (actData ?? [])) {
      activationCounts[a.license_id] = (activationCounts[a.license_id] ?? 0) + 1;
    }
  }

  const licenses = (data ?? []).map((l: any) => ({
    ...l,
    device_count: activationCounts[l.id] ?? 0,
    activations: undefined,
  }));

  return json({ licenses, total: count ?? 0, page, limit });
}

// ─── Get single license detail with activations ──────────────────────

async function handleDetail(supabase: any, params: any) {
  const { license_id } = params;
  if (!license_id) return json({ error: "license_id required" }, 400);

  const { data: license, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("id", license_id)
    .single();

  if (error || !license) return json({ error: "License not found" }, 404);

  const { data: activations } = await supabase
    .from("activations")
    .select("*")
    .eq("license_id", license_id)
    .order("created_at", { ascending: false });

  return json({
    license: {
      ...license,
      device_count: (activations ?? []).length,
      activations: activations ?? [],
    },
  });
}

// ─── Revoke a license ────────────────────────────────────────────────

async function handleRevoke(supabase: any, params: any) {
  const { license_id } = params;
  if (!license_id) return json({ error: "license_id required" }, 400);

  const { error } = await supabase
    .from("licenses")
    .update({ status: "revoked" })
    .eq("id", license_id);

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, message: "License revoked" });
}

// ─── Delete an unused license ────────────────────────────────────────

async function handleDelete(supabase: any, params: any) {
  const { license_id } = params;
  if (!license_id) return json({ error: "license_id required" }, 400);

  // Only delete issued, unactivated licenses
  const { data: lic } = await supabase
    .from("licenses")
    .select("status")
    .eq("id", license_id)
    .single();

  if (!lic) return json({ error: "License not found" }, 404);
  if (lic.status !== "issued") {
    return json({ error: "Hanya lisensi unused (issued) yang bisa dihapus" }, 400);
  }

  // Also check no activations exist (belt and suspenders)
  const { count: actCount } = await supabase
    .from("activations")
    .select("*", { count: "exact", head: true })
    .eq("license_id", license_id);

  if ((actCount ?? 0) > 0) {
    return json({ error: "Lisensi sudah memiliki aktivasi, tidak bisa dihapus" }, 400);
  }

  const { error } = await supabase
    .from("licenses")
    .delete()
    .eq("id", license_id);

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, message: "License deleted" });
}

// ─── Summary stats ───────────────────────────────────────────────────

async function handleStats(supabase: any) {
  const { data: allLicenses } = await supabase
    .from("licenses")
    .select("status");

  const stats: Record<string, number> = {
    total: (allLicenses ?? []).length,
    issued: 0,
    activated: 0,
    revoked: 0,
    total_activations: 0,
  };

  for (const r of (allLicenses ?? [])) {
    stats[r.status] = (stats[r.status] ?? 0) + 1;
  }

  const { count: activationCount } = await supabase
    .from("activations")
    .select("*", { count: "exact", head: true });

  stats.total_activations = activationCount ?? 0;

  return json({ stats });
}

// ─── Helpers ──────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
