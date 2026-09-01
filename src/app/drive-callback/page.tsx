"use client";

// ─── Callback OAuth Cloud Google — /drive-callback ───────────────────────
// Google mengarahkan ke sini SETELAH user klik "Izinkan" (client Web app,
// redirect URI terdaftar). Kode ?code= langsung dipakai server via edge fn
// `cloud-google` action `add_account` → akun Drive tersambung OTOMATIS.
// Tanpa copy-paste kode — alur: klik tombol → pilih akun → izinkan → beres.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { submitDriveAccountCode } from "@/lib/cloud-google";

function DriveCallbackInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Menyambungkan akun Google Drive…");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");
    if (err) {
      setState("error");
      setMessage(
        err === "access_denied"
          ? "Izin ditolak. Ulangi dan klik 'Izinkan' di halaman Google."
          : `Google menolak: ${err}`,
      );
      return;
    }
    if (!code) {
      setState("error");
      setMessage("Kode OAuth tidak ditemukan di URL.");
      return;
    }
    submitDriveAccountCode(code)
      .then((r) => {
        setState("ok");
        setMessage(
          r.email
            ? `✅ ${r.email} tersambung sebagai akun Cloud Google.`
            : "✅ Akun Drive tersambung.",
        );
      })
      .catch((e: Error) => {
        setState("error");
        setMessage(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">
          {state === "working" ? "⏳" : state === "ok" ? "✅" : "❌"}
        </div>
        <h1 className="text-lg font-bold text-gray-900">Cloud Google</h1>
        <p
          className={`text-sm ${
            state === "error" ? "text-red-600" : "text-gray-600"
          }`}
        >
          {message}
        </p>
        <a
          href="/dashboard?tab=cloud"
          className="inline-block px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}

export default function DriveCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Memuat…
        </div>
      }
    >
      <DriveCallbackInner />
    </Suspense>
  );
}
