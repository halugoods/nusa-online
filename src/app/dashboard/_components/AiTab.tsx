"use client";

import { useState, useEffect } from "react";
import {
  fetchAiSettings,
  saveAiSettings,
  testAiConfig,
  fetchAiModels,
  type AiSettingsRecord,
} from "@/lib/ai-settings";

// ─── Tab AI — dashboard nusa-online (Custom Provider Hub) ─────────────
// Full custom config: Base URL + API Key + Test Connection → Auto Fetch Models
// Mendukung endpoint OpenAI-compatible apa pun (OpenRouter, Groq, DeepSeek, Local AI, dll).

const QUICK_SUGGESTIONS = [
  {
    label: "OpenRouter (Default)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-lite-001",
  },
  {
    label: "Groq Cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    label: "DeepSeek Official",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    label: "OpenAI Direct",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
];

export default function AiTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latency_ms?: number;
    reply?: string;
  } | null>(null);

  // Form input
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Config tersimpan dari cloud
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
        setApiKey("");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleTestAndFetch() {
    if (!baseUrl.trim()) {
      setTestResult({ ok: false, message: "Isi Base URL terlebih dahulu." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError("");

    try {
      const res = await testAiConfig({
        owner: "*",
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || "gpt-3.5-turbo",
      });
      setTestResult(res);

      if (res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        if (!model.trim() || !res.models.includes(model.trim())) {
          setModel(res.models[0]);
        }
      } else {
        // Fallback coba fetch list models eksplisit
        const directModels = await fetchAiModels({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        });
        if (directModels.length > 0) {
          setAvailableModels(directModels);
          if (!model.trim()) setModel(directModels[0]);
        }
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Gagal menghubungi provider AI." });
    }
    setTesting(false);
  }

  async function handleLoadModelListOnly() {
    if (!baseUrl.trim()) return;
    setFetchingModels(true);
    try {
      const models = await fetchAiModels({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      });
      if (models.length > 0) {
        setAvailableModels(models);
        if (!model.trim()) setModel(models[0]);
      } else {
        setError("Provider tidak mengembalikan daftar model atau endpoint /models tidak diizinkan.");
      }
    } catch (e: any) {
      setError(e.message || "Gagal fetch daftar model.");
    }
    setFetchingModels(false);
  }

  async function handleSave() {
    if (!baseUrl.trim()) {
      setError("Base URL wajib diisi.");
      return;
    }
    if (!model.trim()) {
      setError("Model AI wajib diisi atau dipilih.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveSuccess("");

    try {
      await saveAiSettings({
        owner: "*",
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setSaveSuccess("Konfigurasi AI berhasil disimpan & aktif secara global!");
      setApiKey("");
      await reload();
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan konfigurasi AI.");
    }
    setSaving(false);
  }

  function handleApplyQuick(q: typeof QUICK_SUGGESTIONS[0]) {
    setBaseUrl(q.baseUrl);
    setModel(q.model);
    setAvailableModels([]);
    setTestResult(null);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pengaturan AI Assistant</h2>
        <p className="text-xs text-gray-500 mt-1">
          Hub konfigurasi AI mandiri. Masukkan Base URL dan API Key provider pilihan Anda (OpenRouter, Groq, DeepSeek, OpenAI, Ollama, dll).
        </p>
      </div>

      {/* Status Config Aktif */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Status Server Aktif</span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              saved?.is_custom
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${saved?.is_custom ? "bg-emerald-500" : "bg-slate-400"}`} />
            {saved?.is_custom ? "Custom Provider Aktif" : "Default Bawaan"}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 py-2">Memuat konfigurasi aktif...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Base URL Terdaftar</p>
              <p className="font-mono text-xs text-slate-800 mt-1 break-all font-medium">
                {saved?.base_url || "https://openrouter.ai/api/v1"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Model Terdaftar</p>
              <p className="font-mono text-xs text-slate-800 mt-1 font-semibold">
                {saved?.model || "google/gemini-2.0-flash-lite-001"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Custom Provider */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Konfigurasi Model & Endpoint Kustom</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Format OpenAI Compatible (`/chat/completions` & `/models`).
          </p>
        </div>

        {/* Quick Fill Suggestions */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Pilihan Cepat (Opsional)
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleApplyQuick(q)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary/60 hover:bg-primary/5 text-xs text-gray-700 transition-all font-medium"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Base URL & API Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Base URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              API Key <span className="text-gray-400 font-normal">(opsional / bawaan)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Test Connection Button & Model Selection */}
        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestAndFetch}
              disabled={testing || !baseUrl.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menguji & Mengambil Model...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Tes Koneksi & Ambil Model
                </>
              )}
            </button>

            {availableModels.length > 0 && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                ✓ {availableModels.length} Model Ditemukan
              </span>
            )}
          </div>
        </div>

        {/* Model AI input / dropdown */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700">
              Model AI <span className="text-rose-500">*</span>
            </label>
            {baseUrl.trim() && availableModels.length === 0 && (
              <button
                type="button"
                onClick={handleLoadModelListOnly}
                disabled={fetchingModels}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {fetchingModels ? "Mengambil..." : "Ambil list model dari provider"}
              </button>
            )}
          </div>

          {availableModels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Atau ketik model manual..."
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          ) : (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. google/gemini-2.0-flash-lite-001, deepseek-chat, gpt-4o-mini"
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          )}
          <p className="text-[11px] text-gray-400">
            Dapat dipilih dari hasil scan otomatis provider atau diketik manual sesuai ID model.
          </p>
        </div>

        {/* Feedback / Test Result */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              testResult.ok
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>{testResult.ok ? "✅ Koneksi Berhasil" : "❌ Uji Koneksi Gagal"}</span>
              {testResult.latency_ms != null && (
                <span className="font-mono text-[11px] opacity-75">{testResult.latency_ms} ms</span>
              )}
            </div>
            <p className="mt-1">{testResult.message}</p>
            {testResult.reply && (
              <div className="mt-2 bg-white/70 p-2 rounded-lg border border-emerald-100 font-mono text-[11px] text-slate-700">
                Respon model: &ldquo;{testResult.reply}&rdquo;
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
            {saveSuccess}
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={reload}
            disabled={loading || saving}
            className="px-4 py-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all"
          >
            Reset Form
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !baseUrl.trim() || !model.trim()}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan & Terapkan Global"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
