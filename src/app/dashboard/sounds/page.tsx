"use client";

import { Suspense } from "react";
import DashboardShell from "../_components/DashboardShell";
import NotifikasiTab from "../_components/NotifikasiTab";

// /dashboard/sounds — alias untuk /dashboard/audio, konsisten dengan nama
// bucket storage `nusa-sounds`. Keduanya render komponen yang sama.
export default function SoundsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen text-center py-12 text-gray-400 text-sm">Memuat...</div>}>
      <DashboardShell activeTab="audio">
        <NotifikasiTab />
      </DashboardShell>
    </Suspense>
  );
}