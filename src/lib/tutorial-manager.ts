"use client";

// ─── Tutorial manager — dashboard nusa-online ────────────────────────
// Worker `tutorial-manager`:
//   POST /api/tutorial-manager/{list|create|update|delete}  (admin)
//   POST /storage/tutorial-thumbnails/{key}                 (upload, x-admin-key)
//
// Auth: x-admin-key header (worker cek terhadap NUSA_ADMIN_KEY).

import { getAdminKey } from "./license-manager";

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods.workers.dev";

export interface TutorialRecord {
  id: string;
  title: string;
  yt_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  variants: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function call(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const adminKey = getAdminKey();
  if (!adminKey) throw new Error("Not authenticated");

  const res = await fetch(`${WORKER_URL}/api/tutorial-manager/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function listTutorials(): Promise<TutorialRecord[]> {
  const data = await call("list");
  return data.tutorials ?? [];
}

export async function createTutorial(p: {
  title: string;
  yt_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  variants: string[];
  sort_order?: number;
}): Promise<TutorialRecord> {
  const data = await call("create", p);
  return data.tutorial;
}

export async function updateTutorial(
  id: string,
  p: Partial<{
    title: string;
    yt_url: string;
    thumbnail_url: string | null;
    description: string | null;
    variants: string[];
    sort_order: number;
  }>,
): Promise<TutorialRecord> {
  const data = await call("update", { id, ...p });
  return data.tutorial;
}

export async function deleteTutorial(id: string): Promise<void> {
  await call("delete", { id });
}

/** Upload thumbnail → worker /storage/tutorial-thumbnails/{key}, return URL. */
export async function uploadThumbnail(file: File, key: string): Promise<string> {
  const adminKey = getAdminKey();
  const res = await fetch(`${WORKER_URL}/storage/tutorial-thumbnails/${key}`, {
    method: "POST",
    headers: {
      "x-admin-key": adminKey ?? "",
      "Content-Type": file.type || "image/jpeg",
      "X-Upsert": "1",
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload gagal (${res.status})`);
  // Publik via /img/tutorial-thumbnails/{key} — sama seperti pola gambar.
  return `${WORKER_URL}/img/tutorial-thumbnails/${key}`;
}
