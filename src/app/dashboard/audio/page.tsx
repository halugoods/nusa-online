"use client";

import DashboardShell from "../_components/DashboardShell";
import NotifikasiTab from "../_components/NotifikasiTab";

// /dashboard/audio — URL langsung ke tab Audio/Suara Notifikasi.
// Render NotifikasiTab di dalam DashboardShell yang sama dengan /dashboard.
export default function AudioPage() {
  return (
    <DashboardShell activeTab="audio">
      <NotifikasiTab />
    </DashboardShell>
  );
}