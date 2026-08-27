"use client";

import DashboardShell from "../_components/DashboardShell";
import NotifikasiTab from "../_components/NotifikasiTab";

// /dashboard/sounds — alias untuk /dashboard/audio, konsisten dengan nama
// bucket storage `nusa-sounds`. Keduanya render komponen yang sama.
export default function SoundsPage() {
  return (
    <DashboardShell activeTab="audio">
      <NotifikasiTab />
    </DashboardShell>
  );
}