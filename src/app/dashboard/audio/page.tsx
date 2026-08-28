"use client";

import { Suspense } from "react";
import DashboardShell from "../_components/DashboardShell";
import NotifikasiTab from "../_components/NotifikasiTab";

// /dashboard/audio — URL langsung ke tab Audio/Suara Notifikasi.
// Render NotifikasiTab di dalam DashboardShell yang sama dengan /dashboard.
export default function AudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen text-center py-12 text-gray-400 text-sm">Memuat...</div>}>
      <DashboardShell activeTab="audio">
        <NotifikasiTab />
      </DashboardShell>
    </Suspense>
  );
}