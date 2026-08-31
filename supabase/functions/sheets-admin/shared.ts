// ============================================================================
// NUSA KASIR — shared helpers untuk sheets-admin + sheets-archive-cron
// ============================================================================
// Dipakai bareng oleh:
//   * supabase/functions/sheets-admin/index.ts   (aksi admin + user app)
//   * supabase/functions/sheets-archive-cron/index.ts (rotasi otomatis)
// Supabase edge fn mengizinkan import RELATIF dalam folder functions/
// (satu deno.json lintas fn tidak perlu — import relatif cukup).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const ADMIN_KEY = Deno.env.get("NUSA_ADMIN_KEY") ?? "nusa-admin-2024";

export function isAdmin(req: Request): boolean {
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

async function googleFetch(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API (${res.status}): ${errText.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Ambil access token dari refresh token (OAuth company account). */
export async function getAccessTokenFromRefresh(refreshToken: string): Promise<string> {
  const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const token = data["access_token"] as string | undefined;
  if (!token) throw new Error("Token refresh gagal — tidak ada access_token.");
  return token;
}

/**
 * Arsip SEMUA tab spreadsheet user ke sheets_archive, lalu kosongkan tab.
 * IDEMPOTENT: unique(user_id, bulan, tab) → upsert menimpa, jalan 2× aman.
 * Hapus di sheet HANYA setelah semua tab berhasil tersimpan di Supabase.
 * Dipakai admin (action archive_month) DAN cron otomatis.
 */
export async function archiveUserMonth(
  supabase: any,
  userId: string,
  bulan: string,
): Promise<{ tabs: Record<string, number> }> {
  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    throw new Error("bulan harus format YYYY-MM.");
  }
  const { data } = await supabase
    .from("sheets_registry")
    .select("spreadsheet_id, account_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.spreadsheet_id) {
    throw new Error("User belum punya spreadsheet.");
  }

  // Token dari akun pemilik spreadsheet (multi-akun) / akun utama.
  let token: string;
  if (data.account_id) {
    const { data: acc } = await supabase
      .from("sheets_accounts")
      .select("oauth_refresh_token, enabled")
      .eq("id", data.account_id)
      .maybeSingle();
    if (acc?.enabled && acc.oauth_refresh_token) {
      token = await getAccessTokenFromRefresh(acc.oauth_refresh_token);
    } else {
      token = await getAccessTokenFromRefresh(await mainRefreshToken(supabase));
    }
  } else {
    token = await getAccessTokenFromRefresh(await mainRefreshToken(supabase));
  }
  const spreadsheetId = data.spreadsheet_id;

  // 1. Baca isi semua tab.
  const meta = await googleFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`,
  );
  const titles: string[] = (meta?.sheets ?? [])
    .map((s: any) => s?.properties?.title)
    .filter(Boolean);

  const results: Record<string, number> = {};
  for (const tab of titles) {
    const vals = await googleFetch(
      token,
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab)}?majorDimension=ROWS`,
    );
    const rows: any[][] = vals?.values ?? [];
    const dataRows = rows.length > 0 ? rows.slice(1) : []; // header tidak ikut
    const { error } = await supabase.from("sheets_archive").upsert(
      {
        user_id: userId,
        bulan,
        tab,
        rows: dataRows,
        row_count: dataRows.length,
        archived_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bulan,tab" },
    );
    if (error) throw new Error(`Gagal arsip ${tab}: ${error.message}`);
    results[tab] = dataRows.length;
  }

  // 2. Semua tab aman di Supabase → kosongkan sheet (sync berikutnya menulis
  //    ulang header + data bulan berjalan).
  for (const tab of titles) {
    try {
      await googleFetch(
        token,
        `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab + "!A1:Z100000")}:clear`,
        { method: "POST" },
      );
    } catch (e) {
      console.warn(`[sheets] clear ${tab} gagal (diabaikan): ${e}`);
    }
  }

  return { tabs: results };
}

async function mainRefreshToken(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("sheets_settings")
    .select("oauth_refresh_token, enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.enabled || !data.oauth_refresh_token) {
    throw new Error("Akun Google utama belum terhubung.");
  }
  return data.oauth_refresh_token;
}
