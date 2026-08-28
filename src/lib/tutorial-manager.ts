"use client";

import { getAdminKey } from "./license-manager";

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tutorial-manager`;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ action, ...params }),
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

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object`;

/** Upload thumbnail → public bucket, return the public URL. */
export async function uploadThumbnail(file: File, key: string): Promise<string> {
  const res = await fetch(`${STORAGE_URL}/tutorial-thumbnails/${key}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "image/jpeg",
      // Supabase Storage: header ini jadi cache-control objek. Public CDN
      // menyimpan thumbnail → egress berulang per render berkurang drastis.
      // (Gambar thumbnail tidak pernah berubah per key — key baru per upload.)
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload gagal (${res.status})`);
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tutorial-thumbnails/${key}`;
}