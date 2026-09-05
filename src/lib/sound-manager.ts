"use client";

/**
 * Sound manager (v2.2.55) — kelola suara notifikasi aplikasi NUSA Kasir.
 *
 * Semua file audio disimpan di R2 nusa-images dengan prefix `sounds/`:
 *   - `sounds/{key}.{ext}`  → file audio custom per slot
 *   - `sounds/manifest.json` → { version, sounds: { key: filename } }
 *
 * Worker melayani via /storage/nusa-images/sounds/... (auth x-admin-key untuk
 * tulis, /img/nusa-images/sounds/... untuk baca publik).
 *
 * App (Flutter) membaca manifest.json saat start; kalau version lebih baru
 * dari cache lokal, file yang berubah diunduh ke penyimpanan app lalu
 * dipakai sebagai pengganti asset bawaan.
 */

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

export interface SoundSlotDef {
  key: string;
  label: string;
  description: string;
}

/** 8 slot suara — harus sama dengan enum NusaSound di sound_service.dart. */
export const SOUND_SLOTS: SoundSlotDef[] = [
  { key: "success", label: "Transaksi Sukses", description: "Diputar saat pembayaran berhasil / struk terbit" },
  { key: "error", label: "Error", description: "PIN salah, stok kurang, aksi gagal" },
  { key: "scan", label: "Scan Barcode", description: "Barcode dikenali saat scan" },
  { key: "pop", label: "Keranjang", description: "Item masuk keranjang di kasir" },
  { key: "ding", label: "Pesanan Online", description: "Pesanan online baru masuk" },
  { key: "presence", label: "Presensi", description: "Check-in / check-out berhasil" },
  { key: "lowstock", label: "Stok Menipis", description: "Peringatan stok hampir habis" },
  { key: "ring", label: "Panggil Karyawan", description: "Dering diputar device staf saat owner memanggil (loop)" },
];

export interface SoundsManifest {
  version: number;
  sounds: Record<string, string>; // key → filename
}

function manifestUrl(): string {
  return `${WORKER_URL}/img/nusa-images/sounds/manifest.json`;
}

function publicFileUrl(filename: string): string {
  return `${WORKER_URL}/img/nusa-images/sounds/${filename}`;
}

function authHeaders(contentType?: string): HeadersInit {
  const adminKey = typeof window !== "undefined"
    ? localStorage.getItem("nusa_admin_key") ?? ""
    : "";
  return {
    "x-admin-key": adminKey,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

/** Baca manifest saat ini; null = belum ada custom sound sama sekali. */
export async function fetchManifest(): Promise<SoundsManifest | null> {
  try {
    const res = await fetch(manifestUrl());
    if (!res.ok) return null;
    return (await res.json()) as SoundsManifest;
  } catch {
    return null;
  }
}

export function soundPublicUrl(filename: string): string {
  return publicFileUrl(filename);
}

/**
 * URL untuk suara bawaan aplikasi (8 slot) — disajikan dari Next.js static
 * asset di /public/defaults/{key}.wav. File ini sama dengan asset bawaan
 * di nusa_kasir/assets/audio/ (sudah di-copy saat build web). Dipakai untuk
 * preview bawaan di dashboard sebelum user upload file custom.
 */
export function defaultSoundUrl(slotKey: string): string {
  return `/defaults/${slotKey}.wav`;
}

/** Upload/replace satu slot suara (.wav/.mp3/.ogg), lalu update manifest. */
export async function uploadSound(file: File, slot: SoundSlotDef): Promise<SoundsManifest> {
  const ext = (file.name.split(".").pop() ?? "wav").toLowerCase();
  if (!["wav", "mp3", "ogg", "m4a", "aac"].includes(ext)) {
    throw new Error("Format didukung: wav, mp3, ogg, m4a, aac");
  }
  if (file.size > 2 * 1024 * 1024) throw new Error("Maksimal 2 MB per suara");

  const filename = `${slot.key}.${ext}`;
  const res = await fetch(`${WORKER_URL}/storage/nusa-images/sounds/${filename}`, {
    method: "POST",
    headers: { ...authHeaders(file.type || "application/octet-stream"), "X-Upsert": "1" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload gagal (${res.status})`);

  const prev = (await fetchManifest()) ?? { version: 0, sounds: {} };
  const next: SoundsManifest = {
    version: prev.version + 1,
    sounds: { ...prev.sounds, [slot.key]: filename },
  };
  await writeManifest(next);
  return next;
}

/** Kembalikan slot ke suara bawaan app (hapus dari manifest + hapus file). */
export async function resetSound(slot: SoundSlotDef): Promise<SoundsManifest> {
  const prev = await fetchManifest();
  const sounds = { ...(prev?.sounds ?? {}) };
  const filename = sounds[slot.key];
  delete sounds[slot.key];
  const next: SoundsManifest = { version: (prev?.version ?? 0) + 1, sounds };
  await writeManifest(next);
  if (filename) {
    try {
      await fetch(`${WORKER_URL}/storage/nusa-images/remove`, {
        method: "POST",
        headers: authHeaders("application/json"),
        body: JSON.stringify({ paths: [`sounds/${filename}`] }),
      });
    } catch {
      /* file orphan tidak fatal */
    }
  }
  return next;
}

async function writeManifest(m: SoundsManifest): Promise<void> {
  const res = await fetch(`${WORKER_URL}/storage/nusa-images/sounds/manifest.json`, {
    method: "POST",
    headers: { ...authHeaders("application/json"), "X-Upsert": "1" },
    body: JSON.stringify(m),
  });
  if (!res.ok) throw new Error(`Simpan manifest gagal (${res.status})`);
}
