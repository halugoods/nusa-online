"use client";

import { useEffect, useState } from "react";

// v2.2.57+130 (Milestone D): reset password pindah ke worker Cloudflare.
// Alur: app minta reset → worker generate token, email link
// https://nusa-online.vercel.app/reset-password?token=... → di sini user
// masukkan password baru → POST /api/auth/reset_confirm {token, newPassword}.

const WORKER_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://nusa-cloud.halugoods-indonesia.workers.dev";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Token ada di query (?token=...) — worker kirim link dengan ?token=.
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") ?? "";
    if (t) {
      setToken(t);
    } else {
      // Fallback: hash (#token=...) untuk kompatibilitas link lama.
      const hash = window.location.hash;
      const m = hash.match(/token=([^&]+)/);
      if (m) {
        setToken(m[1]);
      } else {
        setError("Link reset password tidak valid atau sudah kedaluwarsa.");
      }
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
    if (!token) {
      setError("Link reset password tidak valid. Minta link baru dari aplikasi.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${WORKER_URL}/api/auth/reset_confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah password.");
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
                className="w-full px-3 py-2.5 rounded-lg border border-subtle bg-surface text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-medium mb-1.5">
                Ulangi Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-subtle bg-surface text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="Masukkan kembali password"
              />
            </div>
            {error && (
              <div className="text-danger text-sm bg-danger-soft rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan…" : "Simpan Password Baru"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
