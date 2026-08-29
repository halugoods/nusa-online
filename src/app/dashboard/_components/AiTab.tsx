"use client";

import { useState, useEffect } from "react";
import {
  fetchAiSettings,
  saveAiSettings,
  testAiConfig,
  type AiSettingsRecord,
} from "@/lib/ai-settings";

// ─── Tab AI — dashboard nusa-online (Area H) ──────────────────────────
// Atur provider AI (base_url / api_key / model) untuk semua pengguna NUSA.
// Default: OpenRouter (Gemini Flash Lite) — gratis. Owner "*" = global.
//
// Alur:
//   1. Load config saat ini (GET /settings?owner=*)
//   2. User edit draft (belum tersimpan)
//   3. Tombol "Test" → edge fn POST action:test (config draft, tidak disimpan)
//   4. Tombol "Simpan" → edge fn POST action:save_settings (upsert global)

const PRESETS = [
  {
    id: "openrouter",
    label: "OpenRouter (default)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-lite-001",
    hint: "Gratis untuk Gemini Flash Lite, pakai key OpenRouter. Kalau API key dikosongkan, pakai key bawaan server.",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    hint: "Cepat & gratis (rate-limit harian). Isi API key Groq.",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "Butuh API key OpenAI (berbayar).",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    model: "",
    hint: "Endpoint apa pun yang kompatibel OpenAI: DeepSeek, Gemini API langsung, Ollama tunnel, dll.",
  },
];

export default function AiTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latency_ms?: number;
    reply?: string;
  } | null>(null);

  // Draft form (belum tersimpan)
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [preset, setPreset] = useState("openrouter");

  // Config tersimpan (dari server)
  const [saved, setSaved] = useState<AiSettingsRecord | null>(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const cfg = await fetchAiSettings("*");
      if (cfg) {
        setSaved(cfg);
        setBaseUrl(cfg.base_url || "");
        setModel(cfg.model || "");
        // apiKey tidak pernah dibaca server — selalu kosong di UI.
        setApiKey("");
        // Deteksi preset dari base_url.
        if (cfg.base_url?.includes("openrouter")) setPreset("openrouter");
        else if (cfg.base_url?.includes("groq")) setPreset("groq");
        else if (cfg.base_url?.includes("openai.com")) setPreset("openai");
        else setPreset("custom");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(id: string) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
    }
  }

  async function handleTest() {
    if (!baseUrl.trim() || !model.trim()) {
      setTestResult({ ok: false, message: "Isi base_url dan model dulu." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConfig({
        owner: "*",
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  }

  async function handleSave() {
    if (!baseUrl.trim() || !model.trim()) {
      setError("Isi base_url dan model dulu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveAiSettings({
        owner: "*",
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setApiKey(""); // jangan simpan key di state setelah sukses
      await reload();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  const currentModel = saved?.model || "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">AI Assistant</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Konfigurasi provider AI untuk semua pengguna NUSA (AI Chat di aplikasi).
          Default: OpenRouter — Gemini Flash Lite gratis.
        </p>
      </div>

      {/* Status config aktif */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-900 text-sm">Config Aktif</p>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              saved?.is_custom
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {saved?.is_custom ? "Custom Provider" : "Default Bawaan"}
          </span>
        </div>
        {loading ? (
          <p className="text-xs text-gray-400">Memuat...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Base URL</p>
              <p className="font-mono text-xs text-gray-800 mt-0.5 break-all">
                {saved?.base_url || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Model</p>
              <p className="font-mono text-xs text-gray-800 mt-0.5">{currentModel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Form ubah provider */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <p className="font-semibold text-gray-900 text-sm">Ubah Provider AI</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Preset Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                  preset === p.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input-border text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {PRESETS.find((x) => x.id === preset)?.hint}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Base URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              className="w-full px-3 py-2 border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Model
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="google/gemini-2.0-flash-lite-001"
              className="w-full px-3 py-2 border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            API Key{" "}
            <span className="text-gray-400 font-normal">
              (opsional — kosongkan untuk memakai key bawaan server)
            </span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Test result */}
        {testResult && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              testResult.ok
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span className="font-semibold">
              {testResult.ok ? "✅" : "❌"} {testResult.message}
            </span>
            {testResult.latency_ms != null && (
              <span className="ml-2 text-gray-500">{testResult.latency_ms} ms</span>
            )}
            {testResult.reply && (
              <p className="mt-1 text-gray-600 italic">&ldquo;{testResult.reply}&rdquo;</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !baseUrl.trim() || !model.trim()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {testing ? "Menguji..." : "Test Koneksi"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !baseUrl.trim() || !model.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Config"}
          </button>
        </div>
      </div>
    </div>
  );
}
