"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Halaman reset password (v2.2.57+112) — dibuka dari email Supabase Auth.
// Supabase mengarahkan user ke /reset-password#access_token=... setelah
// resetPasswordForEmail. Di sini user memasukkan password baru (2x), lalu
// updateUser dipanggil dengan session dari hash token.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError("Supabase tidak dikonfigurasi.");
      return;
    }
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setSupabase(client);

    // Token ada di URL hash (#access_token=...&type=recovery)
    const hash = window.location.hash;
    const m = hash.match(/access_token=([^&]+)/);
    if (m) {
      setAccessToken(m[1]);
    } else {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("access_token") ?? "";
      setAccessToken(t);
      if (!t) setError("Link reset password tidak valid atau sudah kedaluwarsa.");
    }
  }, []);

  async function handleSubmit() {
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Password dan ulangi password tidak sama.");
      return;
    }
    if (!supabase || !accessToken) {
      setError("Link reset password tidak valid. Minta link baru dari aplikasi.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Set session dari recovery token, lalu update password.
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: "",
      });
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setDone(true);
      // Kembali ke aplikasi via deep link (bila user datang dari HP).
      setTimeout(() => {
        window.location.href = "nusa://reset-password-success";
      }, 2500);
    } catch (e: any) {
      setError(e.message ?? "Gagal mengubah password. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-card border border-subtle p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-gray-900 text-xl font-bold mb-1">Buat Password Baru</h1>
          <p className="text-text-secondary text-sm">
            Masukkan password baru untuk akun NUSA Kasir Anda
          </p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-success-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-gray-900 text-lg font-bold mb-2">Password Berhasil Diubah</h2>
            <p className="text-text-secondary text-sm mb-6">
              Silakan kembali ke aplikasi NUSA Kasir dan login dengan password baru.
            </p>
            <p className="text-text-tertiary text-xs animate-pulse">
              Mengembalikan ke aplikasi…
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-medium mb-1.5">
                Password Baru
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-3 rounded-lg bg-input-fill border border-input-border text-gray-900 placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-medium mb-1.5">
                Ulangi Password Baru
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ketik ulang password"
                className="w-full px-4 py-3 rounded-lg bg-input-fill border border-input-border text-gray-900 placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && (
              <div className="bg-error-soft border border-error/20 rounded-lg p-3">
                <p className="text-error-text text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-bar disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan…
                </span>
              ) : (
                "Simpan Password"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
