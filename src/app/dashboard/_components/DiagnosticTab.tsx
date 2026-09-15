"use client";

import { useState, useEffect } from "react";
import { getAllUsers, getDiagnostic, forceBackup, forceSync, repairData, resyncImages } from "@/lib/diagnostic";

interface UserRow {
  uid: string;
  email: string;
  storeName: string;
  licenseActive: boolean;
  licenseExpiresAt: string;
  lastBackupAt: string;
  backupSizeMB: number;
  deviceCount: number;
  lastSyncAt: string;
  productCount: number;
  transactionCount: number;
  issues: string[];
}

function formatRelative(iso: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DiagnosticTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setFiltered(users);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.uid?.includes(q) ||
      u.storeName?.toLowerCase().includes(q)
    ));
  }, [search, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data.users ?? []);
      setFiltered(data.users ?? []);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    setLoading(false);
  };

  const expandUser = async (uid: string) => {
    if (expandedUid === uid) {
      setExpandedUid(null);
      setDetail(null);
      return;
    }
    setExpandedUid(uid);
    try {
      const data = await getDiagnostic(uid);
      setDetail(data);
    } catch (e) {
      console.error("Failed to get diagnostic:", e);
    }
  };

  const runAction = async (action: string, uid: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case "forceBackup": await forceBackup(uid); break;
        case "forceSync": await forceSync(uid); break;
        case "repairData": await repairData(uid); break;
        case "resyncImages": await resyncImages(uid); break;
      }
      alert(`${action} triggered for ${uid}`);
    } catch (e) {
      alert(`Failed: ${e}`);
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Diagnostic & Repair</h2>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-500">Active Licenses</p>
          <p className="text-2xl font-bold text-green-600">{users.filter(u => u.licenseActive).length}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-500">Stale Backup</p>
          <p className="text-2xl font-bold text-yellow-600">{users.filter(u => !u.lastBackupAt || formatRelative(u.lastBackupAt).includes("d")).length}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-500">With Issues</p>
          <p className="text-2xl font-bold text-red-600">{users.filter(u => u.issues?.length > 0).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by email, UID, or store name..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <button onClick={loadUsers} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          Refresh
        </button>
      </div>

      {/* User table */}
      {loading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Tidak ada user ditemukan</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Store</th>
                <th className="px-3 py-2 text-left font-medium">License</th>
                <th className="px-3 py-2 text-left font-medium">Last Backup</th>
                <th className="px-3 py-2 text-left font-medium">Size</th>
                <th className="px-3 py-2 text-left font-medium">Devices</th>
                <th className="px-3 py-2 text-left font-medium">Issues</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.uid || u.email || Math.random()} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{u.email || <span className="text-gray-400 italic">no email</span>}</td>
                  <td className="px-3 py-2">{u.storeName || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2">
                    <span className={u.licenseActive ? "text-green-600" : "text-red-600"}>
                      {u.licenseActive ? "✅" : "❌"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatRelative(u.lastBackupAt)}</td>
                  <td className="px-3 py-2">{u.backupSizeMB > 0 ? `${u.backupSizeMB} MB` : "—"}</td>
                  <td className="px-3 py-2">{u.deviceCount}</td>
                  <td className="px-3 py-2">
                    {u.issues?.length > 0 ? (
                      <span className="text-red-600 text-xs" title={u.issues.join(", ")}>⚠️ {u.issues.length}</span>
                    ) : (
                      <span className="text-green-500 text-xs">✓</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.uid ? (
                      <button onClick={() => expandUser(u.uid)} className="text-blue-600 underline text-xs">
                        Detail
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">no UID</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            {search && ` (filter: "${search}")`}
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expandedUid && detail && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-white rounded border">
              <h4 className="font-bold text-sm mb-1">License</h4>
              {detail.license ? (
                <>
                  <p className="text-xs">Status: {detail.license.active ? "✅ Active" : `❌ ${detail.license.status}`}</p>
                  <p className="text-xs">Expires: {detail.license.expiresAt || "Never"}</p>
                  <p className="text-xs">Key: <span className="font-mono">{detail.license.key?.slice(0, 16)}...</span></p>
                  <p className="text-xs">Product: {detail.license.product}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400 italic">No license found</p>
              )}
            </div>
            <div className="p-3 bg-white rounded border">
              <h4 className="font-bold text-sm mb-1">Backup</h4>
              {detail.backup?.exists ? (
                <>
                  <p className="text-xs">Last: {detail.backup.lastAt ? formatRelative(detail.backup.lastAt) : "N/A"}</p>
                  <p className="text-xs">Size: {detail.backup.sizeMB} MB</p>
                  <p className="text-xs font-mono text-gray-400 truncate">{detail.backup.path}</p>
                </>
              ) : (
                <p className="text-xs text-red-500">⚠️ No backup in cloud</p>
              )}
            </div>
            <div className="p-3 bg-white rounded border">
              <h4 className="font-bold text-sm mb-1">Sync</h4>
              <p className="text-xs">Devices: {detail.sync?.deviceCount ?? 0}</p>
              <p className="text-xs">Last sync: {detail.sync?.lastSyncAt ? formatRelative(detail.sync.lastSyncAt) : "Never"}</p>
              <p className="text-xs">Pending deltas: {detail.sync?.pendingDeltas ?? 0}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <h4 className="font-bold text-sm mb-1">Data</h4>
              <p className="text-xs">Products: {detail.data?.productCount ?? 0}</p>
              <p className="text-xs">Transactions: {detail.data?.transactionCount ?? 0}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => runAction("forceBackup", expandedUid)} disabled={actionLoading === "forceBackup"} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">
              {actionLoading === "forceBackup" ? "..." : "Force Backup"}
            </button>
            <button onClick={() => runAction("forceSync", expandedUid)} disabled={actionLoading === "forceSync"} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
              {actionLoading === "forceSync" ? "..." : "Force Sync"}
            </button>
            <button onClick={() => runAction("repairData", expandedUid)} disabled={actionLoading === "repairData"} className="px-3 py-1.5 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700">
              {actionLoading === "repairData" ? "..." : "Repair Data"}
            </button>
            <button onClick={() => runAction("resyncImages", expandedUid)} disabled={actionLoading === "resyncImages"} className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
              {actionLoading === "resyncImages" ? "..." : "Re-sync Images"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
