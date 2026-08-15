"use client";

import { useEffect, useState } from "react";
import { getStoreBySlug } from "@/lib/supabase";

// Kompatibilitas: link lama /toko/{slug} (tanpa variant) diarahkan ke
// format baru /toko/{variant}/{slug}. Next.js menganggap satu segmen di
// sini sebagai `variant`; kami coba lookup sebagai slug lama dulu.
//   - Ada toko dengan slug = {variant} & variant terisi → redirect.
//   - Ada toko legacy (slug = {variant}, tanpa variant) → beri petunjuk.
export default function LegacyStorePage({ params }: { params: { variant: string } }) {
  const slug = params.variant;
  const [state, setState] = useState<"loading" | "redirecting" | "outdated" | "missing">("loading");

  useEffect(() => {
    if (!slug) return;
    getStoreBySlug(slug).then((s) => {
      if (s?.variant && s?.slug) {
        setState("redirecting");
        window.location.replace(`/toko/${s.variant}/${s.slug}`);
      } else if (s) {
        setState("outdated");
      } else {
        setState("missing");
      }
    });
  }, [slug]);

  if (state === "loading" || state === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
        <div>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center text-3xl">N</div>
          <h1 className="text-xl font-extrabold text-text-primary">Toko Tidak Ditemukan</h1>
          <p className="text-text-tertiary text-sm mt-2">Link <b className="text-text-secondary">{slug}</b> tidak aktif.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
      <div className="max-w-sm">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-warning/10 flex items-center justify-center text-3xl">!</div>
        <h1 className="text-xl font-extrabold text-text-primary">Alamat Toko Diperbarui</h1>
        <p className="text-text-secondary text-sm mt-2">
          Toko ini belum memiliki alamat website baru. Buka aplikasi <b>NUSA Kasir</b> →
          menu <b>Toko Online</b> → simpan ulang untuk membuat alamat baru.
        </p>
      </div>
    </div>
  );
}
