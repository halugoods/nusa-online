"use client";

import { useState, useEffect, useRef } from "react";
import {
  SOUND_SLOTS,
  fetchManifest,
  soundPublicUrl,
  defaultSoundUrl,
  uploadSound,
  resetSound,
  type SoundsManifest,
} from "@/lib/sound-manager";

// Custom Sounds / Notifikasi audio manager.
// Dipakai oleh:
//   - /dashboard (sidebar tab "Notifikasi")
//   - /dashboard/audio (URL langsung — fokus user)
//   - /dashboard/sounds (alias)
export default function NotifikasiTab() {
  const [manifest, setManifest] = useState<SoundsManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  // { slotKey: objectURL } — URL lokal untuk preview file yang baru dipilih
  // sebelum di-upload. Revoke saat slot diganti/dihapus.
  const [localPreview, setLocalPreview] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setManifest(await fetchManifest());
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    return () => {
      audioRef.current?.pause();
      // bersihkan object URL lokal saat unmount
      Object.values(localPreview).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePick(slot: (typeof SOUND_SLOTS)[number], file: File | undefined) {
    if (!file) return;
    // Stop preview bawaan / sebelumnya dulu
    stopAudio();
    // Tampilkan preview file lokal sebelum user tekan upload — TIDAK upload
    // otomatis. User bisa dengar dulu, baru yakin upload.
    const oldUrl = localPreview[slot.key];
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const url = URL.createObjectURL(file);
    setLocalPreview((prev) => ({ ...prev, [slot.key]: url }));

    setBusyKey(slot.key);
    setError("");
    try {
      const m = await uploadSound(file, slot);
      setManifest(m);
      // Setelah upload sukses, object URL sudah tidak diperlukan — manifest
      // cloud yang dipakai untuk playback.
      URL.revokeObjectURL(url);
      setLocalPreview((prev) => {
        const { [slot.key]: _drop, ...rest } = prev;
        return rest;
      });
    } catch (e: any) {
      setError(e.message);
    }
    setBusyKey(null);
  }

  async function handleReset(slot: (typeof SOUND_SLOTS)[number]) {
    if (!confirm(`Kembalikan "${slot.label}" ke suara bawaan aplikasi?`)) return;
    setBusyKey(slot.key);
    setError("");
    try {
      const m = await resetSound(slot);
      setManifest(m);
      // Bersihkan preview lokal
      const oldUrl = localPreview[slot.key];
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        setLocalPreview((prev) => {
          const { [slot.key]: _drop, ...rest } = prev;
          return rest;
        });
      }
      stopAudio();
    } catch (e: any) {
      setError(e.message);
    }
    setBusyKey(null);
  }

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingKey(null);
  }

  function playPreview(key: string, src: string) {
    audioRef.current?.pause();
    const a = new Audio(src);
    a.onended = () => setPlayingKey(null);
    a.onerror = () => setPlayingKey(null);
    audioRef.current = a;
    setPlayingKey(key);
    a.play().catch(() => setPlayingKey(null));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Suara Notifikasi</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Ganti suara notifikasi aplikasi Kasir dengan file audiomu sendiri (.wav / .mp3 / .ogg, maks 2 MB).
          Tekan <strong>Putar</strong> untuk mendengar suara bawaan & preview file yang baru dipilih
          sebelum disimpan. Perangkat yang teraktivasi akan otomatis memakai suara baru
          saat aplikasi dibuka ulang.
        </p>
        {manifest && manifest.version > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">Versi konfigurasi: v{manifest.version}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      <div className="space-y-3">
        {SOUND_SLOTS.map((slot) => {
          const filename = manifest?.sounds[slot.key];
          const isCustom = !!filename;
          const hasLocal = !!localPreview[slot.key];
          const busy = busyKey === slot.key;
          const playing = playingKey === slot.key;
          return (
            <div key={slot.key} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <span className="text-lg">
                  {hasLocal ? "🎧" : isCustom ? "🎵" : "🔔"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{slot.label}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    hasLocal
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : isCustom
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>
                    {hasLocal ? "Preview" : isCustom ? "Custom" : "Bawaan"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
                {hasLocal && (
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    File dipilih — belum diupload. Tekan Simpan untuk mengganti suara bawaan.
                  </p>
                )}
                {isCustom && !hasLocal && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={filename!}>{filename}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {/* Preview bawaan — selalu tersedia */}
                <button
                  onClick={() => playing && !hasLocal && !isCustom
                    ? stopAudio()
                    : playing
                      ? stopAudio()
                      : playPreview(slot.key, defaultSoundUrl(slot.key))}
                  disabled={busy}
                  title="Putar suara bawaan"
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    playing && !isCustom && !hasLocal
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-gray-600 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {playing && !isCustom && !hasLocal ? "⏹ Stop" : "🔔 Bawaan"}
                </button>
                {/* Preview custom (kalau sudah upload) atau preview lokal */}
                {(isCustom || hasLocal) && (
                  <button
                    onClick={() => playing
                      ? stopAudio()
                      : playPreview(
                          slot.key,
                          hasLocal ? localPreview[slot.key] : soundPublicUrl(filename!)
                        )}
                    disabled={busy}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      playing && (isCustom || hasLocal)
                        ? "text-red-600 bg-red-50 hover:bg-red-100"
                        : "text-gray-600 hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    {playing && (isCustom || hasLocal) ? "⏹ Stop" : "▶ Putar"}
                  </button>
                )}
                {/* Upload / Ganti / Simpan */}
                <label
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer rounded-lg transition-colors ${
                    busy ? "text-gray-300 bg-gray-50" : "text-primary hover:bg-primary/5"
                  }`}
                >
                  {busy
                    ? "Mengunggah..."
                    : hasLocal
                      ? "Simpan"
                      : isCustom
                        ? "Ganti"
                        : "Upload"}
                  <input
                    type="file"
                    accept=".wav,.mp3,.ogg,.m4a,.aac,audio/*"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePick(slot, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {isCustom && (
                  <button
                    onClick={() => handleReset(slot)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
