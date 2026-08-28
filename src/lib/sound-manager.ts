"use client";

/**
 * Sound manager (v2.2.55) — kelola suara notifikasi aplikasi NUSA Kasir.
 *
 * Semua file audio disimpan di bucket publik `nusa-sounds`:
 *   - `{key}.{ext}`          → file audio custom per slot
 *   - `manifest.json`        → { version, sounds: { key: filename } }
 *
 * App (Flutter) membaca manifest.json saat start; kalau version lebih baru
 * dari cache lokal, file yang berubah diunduh ke penyimpanan app lalu
 * dipakai sebagai pengganti asset bawaan.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object`;
const BUCKET = "nusa-sounds";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  return `${STORAGE_URL}/${BUCKET}/manifest.json`;
}

function publicFileUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

function authHeaders(contentType?: string): HeadersInit {
  // Bucket publik: tulis lewat anon key (pola sama dengan uploadThumbnail).
  return {
    "apikey": ANON_KEY,
    ...(contentType ? { "Content-Type": contentType } : {}),
    "Authorization": `Bearer ${ANON_KEY}`,
  };
}

/** Baca manifest saat ini; null = belum ada custom sound sama sekali. */
export async function fetchManifest(): Promise<SoundsManifest | null> {
  try {
    // Tanpa no-store: manifest jarang berubah (cuma pas upload/reset).
    // Version naik tiap update → cache bust otomatis (app & dashboard
    // bandingin version, bukan nama file). Mengurangi egress berulang.
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
  const res = await fetch(`${STORAGE_URL}/${BUCKET}/${filename}`, {
    method: "PUT",
    headers: authHeaders(file.type || "application/octet-stream"),
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
      await fetch(`${STORAGE_URL}/${BUCKET}/${filename}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      /* file orphan tidak fatal */
    }
  }
  return next;
}

async function writeManifest(m: SoundsManifest): Promise<void> {
  const res = await fetch(manifestUrl(), {
    method: "PUT",
    headers: authHeaders("application/json"),
    body: JSON.stringify(m),
  });
  if (!res.ok) throw new Error(`Simpan manifest gagal (${res.status})`);
}
