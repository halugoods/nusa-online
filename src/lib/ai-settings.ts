"use client";

// ─── AI Settings manager — dashboard nusa-online (Area H) ─────────────
// Worker `ai-assistant`:
//   GET  /api/ai-assistant/settings?owner=<owner>  → ambil config AI (publik)
//   POST /api/ai-assistant/save_settings            → simpan provider config (admin)
//   POST /api/ai-assistant/test                     → test koneksi provider (admin)

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

export interface AiSettingsRecord {
  base_url: string;
  model: string;
  is_custom: boolean;
  default_model: string;
  owner?: string | null;
  updated_at?: string | null;
}

export async function fetchAiSettings(owner?: string): Promise<AiSettingsRecord | null> {
  const url = owner
    ? `${WORKER_URL}/api/ai-assistant/settings?owner=${encodeURIComponent(owner)}`
    : `${WORKER_URL}/api/ai-assistant/settings`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as AiSettingsRecord;
  } catch {
    return null;
  }
}

async function postAction(action: string, payload: Record<string, unknown> = {}) {
  const adminKey = typeof window !== "undefined"
    ? localStorage.getItem("nusa_admin_key")
    : null;
  const res = await fetch(`${WORKER_URL}/api/ai-assistant/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey ?? "",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// Simpan provider AI (upsert ai_settings). `apiKey` bisa dikosongkan untuk
// memakai key bawaan (OPENROUTER_API_KEY env worker).
export async function saveAiSettings(opts: {
  owner: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<void> {
  await postAction("save_settings", {
    owner: opts.owner,
    base_url: opts.baseUrl,
    api_key: opts.apiKey,
    model: opts.model,
  });
}

export interface AiTestResult {
  ok: boolean;
  model?: string;
  message: string;
  latency_ms?: number;
  reply?: string;
}

export async function testAiConfig(opts: {
  owner: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<AiTestResult> {
  const data = await postAction("test", {
    owner: opts.owner,
    base_url: opts.baseUrl,
    api_key: opts.apiKey,
    model: opts.model,
  });
  return {
    ok: data.ok === true,
    model: data.model,
    message: data.message ?? (data.ok ? "OK" : "Gagal"),
    latency_ms: data.latency_ms,
    reply: data.reply,
  };
}
